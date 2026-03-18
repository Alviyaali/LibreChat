import { logger } from '@librechat/data-schemas';

/** 250 MiB - default max file size for conversation imports */
export const DEFAULT_IMPORT_FILE_SIZE = 262_144_000; // 250 MiB

/** Resolves the import file-size limit from the env var, falling back to the 250 MiB default */
export function resolveImportMaxFileSize(): number {
    const raw = process.env.CONVERSATION_IMPORT_MAX_FILE_SIZE_BYTES;
    if (!raw) {
        return DEFAULT_IMPORT_FILE_SIZE;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        logger.warn(
            `[imports] Invalid CONVERSATION_IMPORT_MAX_FILE_SIZE_BYTES="${raw}"; using default ${DEFAULT_IMPORT_FILE_SIZE} bytes.`,
        );
        return DEFAULT_IMPORT_FILE_SIZE;
    }
    return parsed;
}

/** 500 MiB - default max file size for contact CSV imports */
export const DEFAULT_CONTACTS_IMPORT_MAX_FILE_SIZE = 524_288_000; // 500 MiB

/** Resolves the contacts CSV import file-size limit from the env var, falling back to the 500 MiB default */
export function resolveContactsImportMaxFileSize(): number {
    const raw = process.env.CONTACTS_IMPORT_MAX_FILE_SIZE_BYTES;

    if (!raw) {
        return DEFAULT_CONTACTS_IMPORT_MAX_FILE_SIZE;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        logger.warn(
            `[imports] Invalid CONTACTS_IMPORT_MAX_FILE_SIZE_BYTES="${raw}"; using default ${DEFAULT_CONTACTS_IMPORT_MAX_FILE_SIZE} bytes.`,
        );
        return DEFAULT_CONTACTS_IMPORT_MAX_FILE_SIZE;
    }
    return parsed;
}