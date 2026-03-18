const { Tool } = require('@langchain/core/tools');
const { logger } = require('@librechat/data-schemas');
const { Contact } = require('~/db/models');

const contactSearchJsonSchema = {
  type: 'object',
  properties: {
    companyName: {
      type: 'string',
      description: 'The company name to search for (partial or full match).',
    },
    personName: {
      type: 'string',
      description: 'The person name to search for (partial or full match).',
    },
    role: {
      type: 'string',
      description: 'The job title or role to search for (partial or full match).',
    },
    industry: {
      type: 'string',
      description:
        'The industry to filter contacts by. Searches the metadata.Industry field.',
    },
  },
  required: [],
};

/**
 * Structured tool that enables the LLM to query the internal MongoDB Contacts
 * database autonomously during a conversation.
 *
 * Only the most relevant contacts (up to 20) are returned to keep the response
 * well within LLM token context limits. Queries are always scoped to the
 * authenticated user via the `createdBy` field.
 */
class ContactSearch extends Tool {
  static lc_name() {
    return 'ContactSearch';
  }

  static get jsonSchema() {
    return contactSearchJsonSchema;
  }

  constructor(fields = {}) {
    super(fields);

    this.name = 'contact_search';

    this.description =
      'Search the internal contacts database for people by name, company, role, or industry. ' +
      'Use this tool when the user asks about employees, companies, contacts, or organizational information stored in the system. ' +
      'Returns up to 20 matching contacts with their details.';

    this.schema = contactSearchJsonSchema;
    this.userId = fields.userId;
  }

  /**
   * Builds a MongoDB filter from the LLM-provided arguments.
   * Every query is scoped to the current user. String parameters use
   * case-insensitive regex for partial matching.
   *
   * @param {object} input - The tool call arguments provided by the LLM.
   * @returns {object} A Mongoose-compatible filter object.
   */
  _buildFilter(input) {
    const filter = {};

    if (this.userId) {
      filter.createdBy = this.userId;
    }

    const conditions = [];

    if (input.personName) {
      conditions.push({
        name: { $regex: input.personName.trim(), $options: 'i' },
      });
    }

    if (input.companyName) {
      conditions.push({
        company: { $regex: input.companyName.trim(), $options: 'i' },
      });
    }

    if (input.role) {
      conditions.push({
        role: { $regex: input.role.trim(), $options: 'i' },
      });
    }

    if (input.industry) {
      const industryRegex = { $regex: input.industry.trim(), $options: 'i' };

      conditions.push({
        $or: [
          { 'metadata.Industry': industryRegex },
          { 'metadata.industry': industryRegex },
        ],
      });
    }

    if (conditions.length > 0) {
      filter.$and = conditions;
    }

    return filter;
  }

  /**
   * Formats an array of MongoDB contact documents into a concise text string
   * that the LLM can incorporate into its response without excessive token use.
   *
   * @param {object[]} contacts - Array of lean contact documents.
   * @returns {string} Formatted text representation of the contacts.
   */
  _formatResults(contacts) {
    return contacts
      .map((c, idx) => {
        const parts = [`${idx + 1}. Name: ${c.name ?? 'N/A'}`];

        if (c.company) {
          parts.push(`Company: ${c.company}`);
        }

        if (c.role) {
          parts.push(`Role: ${c.role}`);
        }

        if (c.email) {
          parts.push(`Email: ${c.email}`);
        }

        if (c.notes) {
          parts.push(`Notes: ${c.notes}`);
        }

        if (c.metadata && Object.keys(c.metadata).length > 0) {
          const metaStr = Object.entries(c.metadata)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');

          parts.push(`Metadata: { ${metaStr} }`);
        }

        return parts.join(' | ');
      })
      .join('\n');
  }

  /**
   * Executes the contact search against MongoDB.
   *
   * @param {object} input - The structured arguments from the LLM tool call.
   * @returns {Promise<string>} A formatted text string of matching contacts.
   */
  async _call(input) {
    try {
      const filter = this._buildFilter(input);

      const contacts = await Contact.find(filter)
        .select('name company role email notes metadata')
        .limit(20)
        .lean();

      if (!contacts || contacts.length === 0) {
        return 'No matching contacts found.';
      }

      const header = `Found ${contacts.length} contact(s):`;
      const body = this._formatResults(contacts);

      return `${header}\n${body}`;
    } catch (err) {
      logger.error('[ContactSearch] Database query failed', err);
      return `Error searching contacts: ${err.message}`;
    }
  }
}

module.exports = ContactSearch;