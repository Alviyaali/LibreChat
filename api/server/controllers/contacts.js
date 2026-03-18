const fs = require('fs');
const csvParser = require('csv-parser');
const { logger } = require('@librechat/data-schemas');
const { Contact } = require('~/db/models');


/**Core schema fields mapped from CSV headers (case-insensitive, trimned) */
const KNOWN_FIELDS = new Set(['name', 'company', 'email', 'phone', 'notes']);

/**
 * CSV column aliases: map non-strandard header name to their cononical schema field name
 * e.g. a CSV with a "mobile" column should map to "phone"
 */
const COLUMN_ALIASES = new Map([
    ['company_name', 'company'],
    ['designation', 'role'],
    ['mobile', 'phone']
]);

/**Columns that are combined into a single 'name' field */
const NAME_PART_KEYS = new Set(['first_name', 'middle_name', 'last_name']);

/**Batch size for MongoDB inserMany calls -keep memory footprint constant */
const BATCH_SIZE = 5_000;

/**
 * Transforms a CSV row into a Contact document.
 * Mapping rules (applied in priority orders):
 *     1. first_name / middle_name / last_name -> composed into the "name" field
 *     2. COLUMN_ALIASES                       -> single-column rename (eg "mobile" -> "phone")
 *     3. KNOWN_FIELDS                         -> direct schema field assignment
 *     4. metadata                             -> stored in the matadata object
 * 
 * @param {Record<string, string>} row - Raw key-value pairs from a csv-parser
 * @param {string} userId - The authenticated user's ID
 * @returns {object} A Contact-shaped document ready for insertion
 */
const transformRow = (row, userId) => {
    const doc = { metadata: {}, createdBy: userId };
    let firstName = '';
    let middleName = '';
    let lastName = '';

    for (const [key, value] of Object.entries(row)) {
        const normalizedKey = key.trim().toLowerCase();
        const trimedValue = typeof value === 'string' ? value.trim() : String(value ?? '').trim();

        if (normalizedKey === 'first_name') {
            firstName = trimedValue;
        } else if (normalizedKey === 'middle_name') {
            middleName = trimedValue;
        } else if (normalizedKey === 'last_name') {
            lastName = trimedValue;
        } else if (COLUMN_ALIASES.has(normalizedKey)) {
            doc[COLUMN_ALIASES.get(normalizedKey)] = trimedValue;
        } else if (KNOWN_FIELDS.has(normalizedKey)) {
            doc[normalizedKey] = trimedValue;
        } else {
            doc.metadata[key.trim()] = value;
        }
    }

    // Compose full name from individual parts, skip if all are empty
    const composedName = [firstName, middleName, lastName].filter(Boolean).join(' ');
    if (composedName) {
        doc.name = composedName;
    }

    return doc;
};


/**
 * Flushes a batch of documents into MongoDB
 * Uses ordered: false so a single bad row not abort the whole batch.
 * On MongoBulkWriteError, counts successful inserted docs and individual failures.
 * 
 * @param {object[]} batch - Array of contact documents to insert
 * @returns {{ inseted: number, skipped: number}} Counts for this batch
 */
const flushBatch = async (batch) => {
    if (batch.length === 0) {
        return { inserted: 0, skipped: 0 };
    }
    try {
        const result = await Contact.insertMany(batch, { ordered: false });
        return { inserted: result.length, skipped: 0 };
    } catch (err) {
        if (err.name === 'MongoBulkWriteError' || err.code === 11000) {
            const inserted = err.insertedCount ?? 0;
            const skipped = err.writeErrors?.length ?? (batch.length - inserted);
            return { inserted, skipped };
        }
        throw err;
    }
};

/**
 * GET /api/contacts
 * Returns a paginated, optionally filtered list of contacts belonging to the authenticated user.
 * 
 * Query params:
 * page {number} - Page number (default: 1)
 * limit {number} - Records per page (default: 25, max: 10)
 * search {string} - Optionla regex search against name and company fields
 */
const getContacts = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
        const skip = (page - 1) * limit;

        const filter = { createdBy: req.user.id };

        if (req.query.search) {
            const regex = new RegExp(req.query.search, 'i');
            filter.$or = [{ name: regex }, { company: regex }];
        }

        const [contacts, total] = await Promise.all([
            Contact.find(filter).lean().skip(skip).limit(limit),
            Contact.countDocuments(filter)
        ]);

        res.status(200).json({
            contacts,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (err) {
        logger.error('GET /api/contacts - Error fetching contacts', err);
        res.status(500).json({ message: 'Failed to fetch contacts', error: err.message });
    }
};

/**
 * POST /api/contacts/upload
 * Streams a CSV file from disk through csv-parser, transforming rows into Contact
 * documents and inserting them in batches of BATCH_SIZE to prevent heap exhaustion.
 * Supports files up to 1_000_000+ rows with a constant memory footprint.
 *
 * Expects: multipart/form-data with a single file field named "file".
 * The temp file written by multer diskStorage is cleaned up after processing.
 *
 * Response: { message, inserted, skipped, totalRows }
 */
const uploadContactsCsv = async (req, res) => {
    if (!req.file?.path) {
        return res.status(400).json({ message: 'No CSV file provided' });
    }

    const filePath = req.file.path;
    const cleanup = () => fs.unlink(filePath, (err) => {
        if (err) {
            logger.error('[POST /api/contacts/upload] Failed to delete temp file', err);
        }
    });

    let batch = [];
    let totalRows = 0;
    let totalInserted = 0;
    let totalSkipped = 0;

    try {
        await new Promise((resolve, reject) => {
            const parser = fs.createReadStream(filePath).pipe(csvParser());

            const handleData = (row) => {
                totalRows += 1;
                batch.push(transformRow(row, req.user.id));

                if (batch.length < BATCH_SIZE) {
                    return;
                }

                parser.pause();
                const toInsert = batch.splice(0);

                flushBatch(toInsert)
                    .then(({ inserted, skipped }) => {
                        totalInserted += inserted;
                        totalSkipped += skipped;
                        parser.resume();
                    })
                    .catch(reject);
            };

            parser.on('data', handleData);
            parser.on('error', reject);
            parser.on('end', () => {
                flushBatch(batch.splice(0))
                    .then(({ inserted, skipped }) => {
                        totalInserted += inserted;
                        totalSkipped += skipped;
                        resolve();
                    })
                    .catch(reject);
            });
        });

        logger.info(
            `[POST /api/contacts/upload] Import complete - inserted: ${totalInserted}, skipped: ${totalSkipped}, totalRows: ${totalRows}`,
        );

        res.status(200).json({
            message: 'Contacts imported successfully',
            count: totalInserted,
            skipped: totalSkipped,
            totalRows,
        });
    } catch (err) {
        logger.error('[POST /api/contacts/upload] Import failed', err);
        res.status(500).json({ message: 'Failed to import contacts', error: err.message });
    } finally {
        cleanup();
    }
};

/**
 * POST /api/contacts
 * Creates a new contact for the authenticated user.
 *
 * Body: { name?, company?, role?, email?, notes?, metadata? }
 */
const createContact = async (req, res) => {
    try {
        const { name, company, role, email, phone, notes, metadata } = req.body ?? {};

        const contact = await Contact.create({
            name,
            company,
            role,
            email,
            phone,
            notes,
            metadata: metadata ?? {},
            createdBy: req.user.id,
        });

        res.status(201).json(contact);
    } catch (err) {
        logger.error('[POST /api/contacts] Error creating contact', err);
        res.status(500).json({
            message: 'Failed to create contact',
            error: err.message,
        });
    }
};

/**
 * GET /api/contacts/:id
 * Retrieves a single contact by ID, scoped to the authenticated user.
 */
const getContactById = async (req, res) => {
    try {
        const contact = await Contact.findOne({
            _id: req.params.id,
            createdBy: req.user.id,
        }).lean();

        if (!contact) {
            return res.status(404).json({ message: 'Contact not found' });
        }

        res.status(200).json(contact);
    } catch (err) {
        logger.error('[GET /api/contacts/:id] Error fetching contact', err);
        res.status(500).json({
            message: 'Failed to fetch contact',
            error: err.message,
        });
    }
};

/**
 * PATCH /api/contacts/:id
 * Updates an existing contact. Only fields present in the body are modified.
 * Scoped to the authenticated user.
 */
const updateContact = async (req, res) => {
    try {
        const { name, company, role, email, phone, notes, metadata } = req.body ?? {};

        const updates = {};

        if (name !== undefined) {
            updates.name = name;
        }

        if (company !== undefined) {
            updates.company = company;
        }

        if (role !== undefined) {
            updates.role = role;
        }

        if (email !== undefined) {
            updates.email = email;
        }

        if (phone !== undefined) {
            updates.phone = phone;
        }

        if (notes !== undefined) {
            updates.notes = notes;
        }

        if (metadata !== undefined) {
            updates.metadata = metadata;
        }

        const contact = await Contact.findOneAndUpdate(
            { _id: req.params.id, createdBy: req.user.id },
            { $set: updates },
            { new: true, runValidators: true },
        ).lean();

        if (!contact) {
            return res.status(404).json({ message: 'Contact not found' });
        }

        res.status(200).json(contact);
    } catch (err) {
        logger.error('[PATCH /api/contacts/:id] Error updating contact', err);
        res.status(500).json({
            message: 'Failed to update contact',
            error: err.message,
        });
    }
};

/**
 * DELETE /api/contacts
 * Permanently removes all contacts belonging to the authenticated user.
 */
const deleteAllContacts = async (req, res) => {
    try {
        const result = await Contact.deleteMany({ createdBy: req.user.id });
        res.status(200).json({ deleted: result.deletedCount });
    } catch (err) {
        logger.error('[DELETE /api/contacts] Error deleting all contacts', err);
        res.status(500).json({
            message: 'Failed to delete all contacts',
            error: err.message,
        });
    }
};

/**
 * DELETE /api/contacts/:id
 * Permanently removes a contact. Scoped to the authenticated user.
 */
const deleteContact = async (req, res) => {
    try {
        const result = await Contact.findOneAndDelete({
            _id: req.params.id,
            createdBy: req.user.id,
        });

        if (!result) {
            return res.status(404).json({ message: 'Contact not found' });
        }

        res.status(204).send();
    } catch (err) {
        logger.error('[DELETE /api/contacts/:id] Error deleting contact', err);
        res.status(500).json({
            message: 'Failed to delete contact',
            error: err.message,
        });
    }
};

module.exports = {
    getContacts,
    uploadContactsCsv,
    createContact,
    getContactById,
    updateContact,
    deleteContact,
    deleteAllContacts,
};
