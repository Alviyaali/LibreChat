/**
 * Shared utilities for contact-related LLM tools.
 * Provides a canonical field-path map, field resolver, and MongoDB filter builder
 * so that ContactSearch and ContactAnalytics share identical query semantics.
 */

/** Top-level Contact schema fields (not nested under metadata). */
const TOP_LEVEL_FIELDS = new Set(['name', 'company', 'role', 'email', 'phone', 'notes']);

/**
 * Maps user-friendly / CSV-header field names to their MongoDB document paths.
 * Keys are lowercase; values are the dot-notated path used in queries.
 */
const FIELD_PATH_MAP = new Map([
  // Top-level schema fields
  ['name', 'name'],
  ['company', 'company'],
  ['role', 'role'],
  ['email', 'email'],
  ['phone', 'phone'],
  ['notes', 'notes'],

  // Metadata fields (from CSV import)
  ['gender', 'metadata.gender'],
  ['dob', 'metadata.dob'],
  ['pan', 'metadata.pan'],
  ['state', 'metadata.state'],
  ['city', 'metadata.city'],
  ['pincode', 'metadata.pincode'],
  ['application_status', 'metadata.application_status'],
  ['chat_id', 'metadata.chat_id'],
  ['lead_id', 'metadata.lead_id'],
  ['state_id', 'metadata.state_id'],
  ['message_id', 'metadata.message_id'],
  ['kyc_successful', 'metadata.kyc_successful'],
  ['income_verified_aa', 'metadata.income_verified_aa'],
  ['application_no', 'metadata.application_no'],
  ['loan_no', 'metadata.loan_no'],
  ['latitude', 'metadata.latitude'],
  ['longitude', 'metadata.longitude'],
  ['id', 'metadata.id'],

  // Common alternative spellings / aliases the LLM might use
  ['applicationstatus', 'metadata.application_status'],
  ['chatid', 'metadata.chat_id'],
  ['leadid', 'metadata.lead_id'],
  ['stateid', 'metadata.state_id'],
  ['messageid', 'metadata.message_id'],
  ['kyc', 'metadata.kyc_successful'],
  ['kycsuccessful', 'metadata.kyc_successful'],
  ['incomeverifiedaa', 'metadata.income_verified_aa'],
  ['applicationno', 'metadata.application_no'],
  ['loanno', 'metadata.loan_no'],
  ['dateofbirth', 'metadata.dob'],
  ['date of birth', 'metadata.dob'],
  ['industry', 'metadata.Industry'],
]);

/**
 * Resolves a user-supplied field name to its MongoDB document path.
 * Performs a case-insensitive lookup in FIELD_PATH_MAP. If no explicit
 * mapping exists, falls back to metadata.{fieldName} so that arbitrary
 * metadata keys can be queried without schema changes.
 *
 * @param {string} fieldName - The field name provided by the LLM or user.
 * @returns {string} The resolved MongoDB document path.
 */
function resolveFieldPath(fieldName) {
  if (!fieldName) {
    return '';
  }

  const normalized = fieldName.trim().toLowerCase();
  if (FIELD_PATH_MAP.has(normalized)) {
    return FIELD_PATH_MAP.get(normalized);
  }

  // Fallback: treat as a metadata key using original casing
  return `metadata.${fieldName.trim()}`;
}

/**
 * Determines whether a value looks numeric (used to decide between
 * regex partial match and exact equality match).
 *
 * @param {string} value
 * @returns {boolean}
 */
function looksNumeric(value) {
  return /^\d+(\.\d+)?$/.test(value);
}

/**
 * Creates a single MongoDB condition for a given field path and value.
 * Uses case-insensitive regex for text values and exact match for numeric-like values.
 *
 * @param {string} fieldPath - Dot-notated MongoDB path.
 * @param {string} value - The value to match against.
 * @returns {object} A MongoDB condition object.
 */
function buildCondition(fieldPath, value) {
  const trimmed = value.trim();

  if (looksNumeric(trimmed)) {
    return {
      $or: [
        { [fieldPath]: trimmed },
        { [fieldPath]: Number(trimmed) },
      ],
    };
  }

  return { [fieldPath]: { $regex: trimmed, $options: 'i' } };
}

/**
 * Parameter-name-to-field-name mapping for the expanded tool schemas.
 * Schema property names use camelCase; this maps them to the canonical
 * field names understood by resolveFieldPath.
 */
const PARAM_FIELD_MAP = new Map([
  ['name', 'name'],
  ['companyName', 'company'],
  ['company', 'company'],
  ['role', 'role'],
  ['email', 'email'],
  ['phone', 'phone'],
  ['gender', 'gender'],
  ['city', 'city'],
  ['state', 'state'],
  ['pincode', 'pincode'],
  ['applicationStatus', 'application_status'],
  ['pan', 'pan'],
  ['dob', 'dob'],
  ['chatId', 'chat_id'],
  ['leadId', 'lead_id'],
  ['stateId', 'state_id'],
  ['kycSuccessful', 'kyc_successful'],
  ['incomeVerifiedAa', 'income_verified_aa'],
  ['applicationNo', 'application_no'],
  ['loanNo', 'loan_no'],
  ['industry', 'industry'],
]);

/**
 * Builds a MongoDB filter object from tool-call input parameters.
 * Every query is scoped to the authenticated user via `createdBy`.
 * All recognized parameters are combined with `$and` semantics.
 *
 * Supports:
 * - All explicitly-mapped parameters (name, company, role, email, etc.)
 * - A generic `metadataField` + `metadataValue` pair for arbitrary metadata queries.
 *
 * @param {object} input - The tool-call arguments provided by the LLM.
 * @param {string} [userId] - The authenticated user's ID.
 * @returns {object} A Mongoose-compatible filter object.
 */
function buildContactFilter(input, userId) {
  const filter = {};

  if (userId) {
    filter.createdBy = userId;
  }

  const conditions = [];

  for (const [param, fieldKey] of PARAM_FIELD_MAP) {
    const value = input[param];
    if (!value || (typeof value === 'string' && !value.trim())) {
      continue;
    }

    const fieldPath = resolveFieldPath(fieldKey);
    conditions.push(buildCondition(fieldPath, String(value)));
  }

  // Generic metadata escape hatch
  if (input.metadataField && input.metadataValue) {
    const fieldPath = resolveFieldPath(input.metadataField);
    conditions.push(buildCondition(fieldPath, String(input.metadataValue)));
  }

  if (conditions.length > 0) {
    filter.$and = conditions;
  }

  return filter;
}

module.exports = {
  TOP_LEVEL_FIELDS,
  FIELD_PATH_MAP,
  PARAM_FIELD_MAP,
  resolveFieldPath,
  buildCondition,
  buildContactFilter,
};