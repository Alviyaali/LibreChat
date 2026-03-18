const os = require('os');
const path = require('path');
const multer = require('multer');
const express = require('express');
const { resolveContactsImportMaxFileSize } = require('@librechat/api');
const { requireJwtAuth, createContactsLimiters } = require('~/server/middleware');
const { getContacts, uploadContactsCsv, createContact, getContactById, updateContact, deleteContact, deleteAllContacts } = require('~/server/controllers/contacts');

const router = express.Router();

/** All contacts endpoints require a valid JWT */
router.use(requireJwtAuth);

/** Per-user rate limiters with a wide 60-minute window to accommodate large CSV uploads */
const { contactsUploadIpLimiter, contactsUploadUserLimiter } = createContactsLimiters();

/**
 * Multer instance configured for disk storage so large CSV files are never held in heap.
 * The temp file path is available as req.file.path and cleaned up by the controller.
 * Accepts only .csv files (by extension or MIME type).
 * Enforces the CONTACTS_IMPORT_MAX_FILE_SIZE_BYTES limit (default 500 MiB).
 */

const csvFileFilter = (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isCsvMime = file.mimetype === 'text/csv' || file.mimetype === 'application/csv';
    const isCsvExt = ext === '.csv';

    if (isCsvMime || isCsvExt) {
        return cb(null, true);
    }
    cb(new Error('Only CSV files are allowed'), false);
};

const upload = multer({
    storage: multer.diskStorage({ destination: os.tmpdir() }),
    fileFilter: csvFileFilter,
    limits: { fileSize: resolveContactsImportMaxFileSize() },
});

/**
 * Wraps upload.single('file) to map multer errors to appropriate HTTP responses.
 * LIMIT_FILE_SIZE: 413 Payload Too Large
 * LIMIT_UNEXPECTED_FILE: 400 Bad Request
 * LIMIT_UNEXPECTED_FIELD: 400 Bad Request
 * All other multer errors: 400 Bad Request
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const handleUpload = (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (!err){
            return next();
        }
        if (err.code === 'LIMIT_FILE_SIZE'){
            return res.status(413).send({
                message: `File exceeds maximum allowed size of ${resolveContactsImportMaxFileSize()} bytes.`,
            });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE'){
            return res.status(400).json({ message: 'Unexpected file field. Use the "file" field name.' });
        }
        return res.status(400).json({ message: err.message });
    });
};

/** GET /api/contacts - paginated list of contacts for the authenticated user */
router.get('/', getContacts);

/** POST /api/contacts -create a new contact*/
router.post('/', createContact);

/**
 * POST /api/contacts/upload - stream-ingest a CSV file into the contacts collection
 * Registered BEFORE /:id toutes so Express does not treat 'upload' as an ID parameter.
 * Rate-limited (IP + user) before the file is accepted to prevent abuse.
 */
router.post('/upload', contactsUploadIpLimiter, contactsUploadUserLimiter, handleUpload, uploadContactsCsv);

/** GET /api/contacts/:id - retrieve a single contact by ID */
router.get('/:id', getContactById);

/** PATCH /api/contacts/:id - update a single contact by ID */
router.patch('/:id', updateContact);

/** DELETE /api/contacts - delete all contacts for the authenticated user */
router.delete('/', deleteAllContacts);

/** DELETE /api/contacts/:id - delete a single contact by ID */
router.delete('/:id', deleteContact);

module.exports = router;