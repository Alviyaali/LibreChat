const { Tool } = require('@langchain/core/tools');
const { logger } = require('@librechat/data-schemas');
const { Contact } = require('~/db/models');
const { resolveFieldPath, buildContactFilter } = require('./contactFilterUtils');

const MAX_GROUPS = 50;

const contactAnalyticsJsonSchema = {
  type: 'object',
  properties: {
    groupBy: {
      type: 'string',
      description:
        'Field name to group/aggregate contacts by. ' +
        'Examples: "gender", "city", "state", "application_status", "pincode", ' +
        '"company", "role", "kyc_successful", "income_verified_aa", "dob". ' +
        'The result will show each distinct value and its count.',
    },
    countOnly: {
      type: 'boolean',
      description:
        'When true, returns only the total count of matching contacts without grouping. ' +
        'Useful for questions like "how many contacts are there?" or "how many contacts are male?".',
    },
    name: {
      type: 'string',
      description: 'Filter by person name (partial match).',
    },
    companyName: {
      type: 'string',
      description: 'Filter by company name (partial match).',
    },
    role: {
      type: 'string',
      description: 'Filter by job title or role (partial match).',
    },
    email: {
      type: 'string',
      description: 'Filter by email address (partial match).',
    },
    phone: {
      type: 'string',
      description: 'Filter by phone number.',
    },
    gender: {
      type: 'string',
      description: 'Filter by gender (e.g. "MALE", "FEMALE").',
    },
    city: {
      type: 'string',
      description: 'Filter by city name.',
    },
    state: {
      type: 'string',
      description: 'Filter by state or region name.',
    },
    pincode: {
      type: 'string',
      description: 'Filter by pincode / zip code.',
    },
    applicationStatus: {
      type: 'string',
      description: 'Filter by application status (e.g. "LEAD-NEW", "LEAD-INCOME").',
    },
    pan: {
      type: 'string',
      description: 'Filter by PAN number.',
    },
    dob: {
      type: 'string',
      description: 'Filter by date of birth.',
    },
    chatId: {
      type: 'string',
      description: 'Filter by chat_id.',
    },
    leadId: {
      type: 'string',
      description: 'Filter by lead_id.',
    },
    stateId: {
      type: 'string',
      description: 'Filter by state_id.',
    },
    kycSuccessful: {
      type: 'string',
      description: 'Filter by KYC success status.',
    },
    incomeVerifiedAa: {
      type: 'string',
      description: 'Filter by income verification status.',
    },
    applicationNo: {
      type: 'string',
      description: 'Filter by application number.',
    },
    loanNo: {
      type: 'string',
      description: 'Filter by loan number.',
    },
    industry: {
      type: 'string',
      description: 'Filter by industry.',
    },
    metadataField: {
      type: 'string',
      description:
        'Name of any metadata field not listed above. Must be used with metadataValue.',
    },
    metadataValue: {
      type: 'string',
      description: 'Value to match for the field specified in metadataField.',
    },
  },
  required: [],
};

/**
 * Structured tool that enables the LLM to answer quantitative and statistical
 * questions about contacts using MongoDB aggregation pipelines.
 *
 * Supports:
 * - Total counts ("how many contacts are there?")
 * - Filtered counts ("how many contacts are male?", "how many in Delhi?")
 * - Grouped breakdowns ("breakdown by gender", "contacts per city",
 *   "application status distribution")
 * - Combined filter + group ("male contacts per city")
 *
 * Queries are always scoped to the authenticated user via `createdBy`.
 */
class ContactAnalytics extends Tool {
  static lc_name() {
    return 'ContactAnalytics';
  }

  static get jsonSchema() {
    return contactAnalyticsJsonSchema;
  }

  constructor(fields = {}) {
    super(fields);

    this.name = 'contact_analytics';

    this.description =
      'Get counts, totals, and statistical breakdowns of contacts. ' +
      'Use this tool for quantitative questions: "how many contacts?", ' +
      '"how many are male/female?", "breakdown by city", "contacts per state", ' +
      '"application status distribution", "how many LEAD-NEW?". ' +
      'Set countOnly=true for simple totals. Set groupBy to a field name for breakdowns. ' +
      'All filter parameters (name, company, gender, city, state, pincode, applicationStatus, ' +
      'pan, dob, chatId, leadId, kycSuccessful, incomeVerifiedAa, applicationNo, loanNo, etc.) ' +
      'can be combined with groupBy or countOnly to narrow the scope. ' +
      'For looking up specific contact details, use the contact_search tool instead.';

    this.schema = contactAnalyticsJsonSchema;
    this.userId = fields.userId;
  }

  /**
   * Formats grouped aggregation results into a readable summary string.
   *
   * @param {object[]} groups - Array of { _id, count } objects from $group.
   * @param {string} fieldName - The human-friendly field name used for groupBy.
   * @param {number} totalCount - Sum of all group counts.
   * @returns {string} Formatted text breakdown.
   */
  _formatGroupResults(groups, fieldName, totalCount) {
    const lines = groups.map(
      (g) => `${g._id ?? '(empty)'}: ${g.count}`,
    );

    return [
      `Breakdown by ${fieldName} (${totalCount} total contacts, ${groups.length} distinct values):`,
      ...lines,
    ].join('\n');
  }

  /**
   * Executes the analytics query against MongoDB using aggregation pipelines.
   *
   * @param {object} input - The structured arguments from the LLM tool call.
   * @returns {Promise<string>} A formatted summary string.
   */
  async _call(input) {
    try {
      const matchFilter = buildContactFilter(input, this.userId);

      if (input.countOnly || (!input.groupBy && !input.countOnly)) {
        const hasGroupBy = input.groupBy && input.groupBy.trim();

        if (!hasGroupBy) {
          const count = await Contact.countDocuments(matchFilter);
          return `Total matching contacts: ${count}`;
        }
      }

      if (input.groupBy) {
        const fieldPath = resolveFieldPath(input.groupBy);

        if (!fieldPath) {
          return 'Error: Could not resolve the groupBy field. Please provide a valid field name.';
        }

        const pipeline = [
          { $match: matchFilter },
          {
            $group: {
              _id: `$${fieldPath}`,
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: MAX_GROUPS },
        ];

        const groups = await Contact.aggregate(pipeline);

        if (!groups || groups.length === 0) {
          return 'No matching contacts found for the given filters.';
        }

        const totalCount = groups.reduce((sum, g) => sum + g.count, 0);
        return this._formatGroupResults(groups, input.groupBy, totalCount);
      }

      const count = await Contact.countDocuments(matchFilter);
      return `Total matching contacts: ${count}`;
    } catch (err) {
      logger.error('[ContactAnalytics] Aggregation query failed', err);
      return `Error analyzing contacts: ${err.message}`;
    }
  }
}

module.exports = ContactAnalytics;