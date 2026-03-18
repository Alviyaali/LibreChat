const rateLimit = require('express-rate-limit');
const { limiterCache } = require('@librechat/api');
const { ViolationTypes } = require('librechat-data-provider');
const logViolation = require('~/cache/logViolation');

const getEnvironmentVariables = () => {
  const CONTACTS_UPLOAD_IP_MAX = parseInt(process.env.CONTACTS_UPLOAD_IP_MAX) || 20;
  const CONTACTS_UPLOAD_IP_WINDOW = parseInt(process.env.CONTACTS_UPLOAD_IP_WINDOW) || 60;
  const CONTACTS_UPLOAD_USER_MAX = parseInt(process.env.CONTACTS_UPLOAD_USER_MAX) || 10;
  const CONTACTS_UPLOAD_USER_WINDOW = parseInt(process.env.CONTACTS_UPLOAD_USER_WINDOW) || 60;
  const CONTACTS_UPLOAD_VIOLATION_SCORE = process.env.CONTACTS_UPLOAD_VIOLATION_SCORE;

  const contactsUploadIpWindowMs = CONTACTS_UPLOAD_IP_WINDOW * 60 * 1000;
  const contactsUploadIpMax = CONTACTS_UPLOAD_IP_MAX;
  const contactsUploadIpWindowInMinutes = contactsUploadIpWindowMs / 60000;

  const contactsUploadUserWindowMs = CONTACTS_UPLOAD_USER_WINDOW * 60 * 1000;
  const contactsUploadUserMax = CONTACTS_UPLOAD_USER_MAX;
  const contactsUploadUserWindowInMinutes = contactsUploadUserWindowMs / 60000;

  return {
    contactsUploadIpWindowMs,
    contactsUploadIpMax,
    contactsUploadIpWindowInMinutes,
    contactsUploadUserWindowMs,
    contactsUploadUserMax,
    contactsUploadUserWindowInMinutes,
    contactsUploadViolationScore: CONTACTS_UPLOAD_VIOLATION_SCORE,
  };
};

const createContactsUploadHandler = (ip = true) => {
  const {
    contactsUploadIpMax,
    contactsUploadUserMax,
    contactsUploadViolationScore,
    contactsUploadIpWindowInMinutes,
    contactsUploadUserWindowInMinutes,
  } = getEnvironmentVariables();

  return async (req, res) => {
    const type = ViolationTypes.CONTACTS_UPLOAD_LIMIT;
    const errorMessage = {
      type,
      max: ip ? contactsUploadIpMax : contactsUploadUserMax,
      limiter: ip ? 'ip' : 'user',
      windowInMinutes: ip ? contactsUploadIpWindowInMinutes : contactsUploadUserWindowInMinutes,
    };

    await logViolation(req, res, type, errorMessage, contactsUploadViolationScore);
    res.status(429).json({ message: 'Too many contacts upload requests. Try again later' });
  };
};

const createContactsLimiters = () => {
  const {
    contactsUploadIpWindowMs,
    contactsUploadIpMax,
    contactsUploadUserWindowMs,
    contactsUploadUserMax,
  } = getEnvironmentVariables();

  const ipLimiterOptions = {
    windowMs: contactsUploadIpWindowMs,
    max: contactsUploadIpMax,
    handler: createContactsUploadHandler(),
    store: limiterCache('contacts_upload_ip_limiter'),
  };
  const userLimiterOptions = {
    windowMs: contactsUploadUserWindowMs,
    max: contactsUploadUserMax,
    handler: createContactsUploadHandler(false),
    keyGenerator: function (req) {
      return req.user?.id;
    },
    store: limiterCache('contacts_upload_user_limiter'),
  };

  const contactsUploadIpLimiter = rateLimit(ipLimiterOptions);
  const contactsUploadUserLimiter = rateLimit(userLimiterOptions);
  return { contactsUploadIpLimiter, contactsUploadUserLimiter };
};

module.exports = { createContactsLimiters };