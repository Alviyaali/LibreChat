import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dataService, MutationKeys, QueryKeys } from 'librechat-data-provider';
import type * as t from 'librechat-data-provider';
import type { UseMutationResult } from '@tanstack/react-query';

/**
 * Hook for creating a new contact.
 * Prepends the new contact to the contact list on success.
 */
export const useCreateContactMutation = (
    options?: t.ContactMutationCallback,
): UseMutationResult<t.TContact, Error, t.CreateContactPayload> => {
    const queryClient = useQueryClient();
    return useMutation(
        (payload: t.CreateContactPayload) => dataService.createContact(payload),
        {
            mutationKey: [MutationKeys.createContact],
            onMutate: (variables) => options?.onMutate?.(variables),
            onError: (error, variables, context) => options?.onError?.(error, variables, context),
            onSuccess: (newContact, variables, context) => {
                queryClient.setQueryData<t.ContactListResponse>(
                    [QueryKeys.contacts, {}],
                    (prev) =>
                        prev != null
                            ? { ...prev, contacts: [newContact, ...prev.contacts] }
                            : { contacts: [newContact], total: 1, page: 1, totalPages: 1 },
                );
                return options?.onSuccess?.(newContact, variables, context);
            },
        },
    );
};

/**
 * Hook for updating an existing contact.
 * Patches the contact in both the list cache and the single-item cache.
 */
export const useUpdateContactMutation = (
    options?: t.ContactMutationCallback,
): UseMutationResult<t.TContact, Error, t.UpdateContactPayload> => {
    const queryClient = useQueryClient();
    return useMutation(
        (payload: t.UpdateContactPayload) => dataService.updateContact(payload),
        {
            mutationKey: [MutationKeys.updateContact],
            onMutate: (variables) => options?.onMutate?.(variables as t.CreateContactPayload),
            onError: (error, variables, context) =>
                options?.onError?.(error, variables as t.CreateContactPayload, context),
            onSuccess: (updatedContact, variables, context) => {
                queryClient.setQueryData<t.TContact>([QueryKeys.contact, variables.id], updatedContact);
                queryClient.setQueryData<t.ContactListResponse>(
                    [QueryKeys.contacts, {}],
                    (prev) =>
                        prev != null
                            ? {
                                  ...prev,
                                  contacts: prev.contacts.map((contact) =>
                                      contact.id === variables.id ? updatedContact : contact,
                                  ),
                              }
                            : prev,
                );
                return options?.onSuccess?.(updatedContact, variables as t.CreateContactPayload, context);
            },
        },
    );
};

/**
 * Hook for deleting a contact.
 * Removes the contact from the list cache and evicts its single-item cache entry.
 */
export const useDeleteContactMutation = (
    options?: t.DeleteContactMutationOptions,
): UseMutationResult<void, Error, string> => {
    const queryClient = useQueryClient();
    return useMutation(
        (id: string) => dataService.deleteContact(id),
        {
            mutationKey: [MutationKeys.deleteContact],
            onMutate: (variables) => options?.onMutate?.(variables),
            onSuccess: (_data, id, context) => {
                queryClient.setQueryData<t.ContactListResponse>(
                    [QueryKeys.contacts, {}],
                    (prev) =>
                        prev != null
                            ? { ...prev, contacts: prev.contacts.filter((c) => c.id !== id) }
                            : prev,
                );
                queryClient.removeQueries([QueryKeys.contact, id]);
                return options?.onSuccess?.(_data, id, context);
            },
            onError: (error, variables, context) => options?.onError?.(error, variables, context),
        },
    );
};

/**
 * Hook for bulk-importing contacts from a CSV file.
 * Invalidates the entire contacts list cache on success since the number of
 * affected rows is unknown at the time of the mutation.
 */
export const useUploadContactsMutation = (
    options?: t.UploadContactsMutationOptions,
): UseMutationResult<
    { count: number },
    Error,
    { formData: FormData; options?: t.uploadContactsOptions }
> => {
    const queryClient = useQueryClient();
    return useMutation(
        ({ formData, options: uploadOptions }) =>
            dataService.uploadContactsCsv(formData, uploadOptions),
        {
            mutationKey: [MutationKeys.uploadContacts],
            onMutate: (variables) => options?.onMutate?.(variables),
            onError: (error, variables, context) => options?.onError?.(error, variables, context),
            onSuccess: (data, variables, context) => {
                queryClient.invalidateQueries([QueryKeys.contacts]);
                return options?.onSuccess?.(data, variables, context);
            },
        },
    );
};

/**
 * Hook for deleting all contacts for the authenticated user.
 * Invalidates the entire contacts list cache on success.
 */
export const useDeleteAllContactsMutation = (
    options?: t.DeleteAllContactsMutationOptions,
): UseMutationResult<t.DeleteAllContactsResponse, Error, void> => {
    const queryClient = useQueryClient();
    return useMutation(
        () => dataService.deleteAllContacts(),
        {
            mutationKey: [MutationKeys.deleteAllContacts],
            onMutate: () => options?.onMutate?.(),
            onError: (error, variables, context) => options?.onError?.(error, variables, context),
            onSuccess: (data, variables, context) => {
                queryClient.invalidateQueries([QueryKeys.contacts]);
                return options?.onSuccess?.(data, variables, context);
            },
        },
    );
};
