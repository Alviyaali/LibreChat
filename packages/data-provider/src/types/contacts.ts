/**
 * Plain-object representation of a Contact document.
 * For the Mongoose document interface, see IContact in @librechat/data-schemas.
 */
export type TContact = {
    id?: string;
    name?: string;
    company?: string;
    role?: string;
    email?: string;
    phone?: string;
    notes?: string;
    /**Arbitrary key-value pairs from CSV columns that do not map to a core field. */
    metadata?: Record<string, unknown>;
    createdBy?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
};

/**
 * Query parameters for listing contacts.
 * 
 * @remarks The server enforces a maximum of 100 for `limit`
 */
export type ContactListParams = {
    /**Full-text search term applied to the name and company fields */
    search?: string;
    /** 1-based page number(default: 1) */
    page?: number;
    /**
     * Number of contacts to return per page.
     * The server enforces a maximum of 100 regardless of the value supplid here
     */
    limit?: number;
};

export type ContactListResponse = {
    contacts: TContact[];
    /**Total bumber of cantacts matching the current filter. */
    total: number;
    /**Current 1-based page number */
    page: number;
    /**Total number of pages */
    totalPages: number;
};

export type CreateContactPayload = {
    name?: string;
    company?: string;
    role?: string;
    email?: string;
    phone?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
};

export type UpdateContactPayload = {
    id: string;
    data: Partial<CreateContactPayload>;
}

/**
 * Options for the CSV upload request.
 * @remarks Server-side limit enforcement and batch streaming are implemented in Phase 3.
 */
export type uploadContactsOptions = {
    /**
     * Called as the file upload progresses. Peceives a value between 0-100.
     * Wire this to a progress bar.
     */
    onUploadProgress?: (progress: number) => void;
};

/* ________Mutation callback shapes________ */
export type ContactMutationCallback = {
    onSuccess?: (data: TContact, variables: CreateContactPayload, context?: unknown) => void;
    onMutate?: (variables: CreateContactPayload) => void | Promise<unknown>;
    onError?: (error: unknown, variables: CreateContactPayload, context?: unknown) => void;
};

export type DeleteContactMutationOptions = {
    onSuccess?: (data: void, variables: string, context?: unknown) => void;
    onMutate?: (variables: string) => void | Promise<unknown>;
    onError?: (error: unknown, variables: string, context?: unknown) => void;
};

export type UploadContactsMutationOptions = {
    onSuccess?: (
        data: { count: number},
        variables: { formData: FormData, options?: uploadContactsOptions },
        context?: unknown,
    ) => void;
    onMutate?: (variables: {
        formData: FormData,
        options?: uploadContactsOptions,
    }) => void | Promise<unknown>;
    onError?: (
        error: unknown,
        variables: { formData: FormData, options?: uploadContactsOptions },
        context?: unknown,
    ) => void;
};

export type DeleteAllContactsResponse = { deleted: number };

export type DeleteAllContactsMutationOptions = {
  onSuccess?: (data: DeleteAllContactsResponse, variables: void, context?: unknown) => void;
  onMutate?: () => void | Promise<unknown>;
  onError?: (error: unknown, variables: void, context?: unknown) => void;
};
