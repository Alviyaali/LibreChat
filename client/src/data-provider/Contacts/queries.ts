import { useQuery } from '@tanstack/react-query';
import { QueryKeys, dataService } from 'librechat-data-provider';
import type { QueryObserverResult, UseQueryOptions } from '@tanstack/react-query';
import type { TContact, ContactListParams, ContactListResponse } from 'librechat-data-provider';

/**
 * Hook for listing contacts with optional cursor-based pagination and full-text search.
 */
export const useListContactsQuery = <TData = ContactListResponse>(
    params: ContactListParams = {},
    config?: UseQueryOptions<ContactListResponse, unknown, TData>,
): QueryObserverResult<TData> => {
    return useQuery<ContactListResponse, unknown, TData>(
        [QueryKeys.contacts, params],
        () => dataService.listContacts(params),
        {
            staleTime: 1000 * 30,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchOnMount: false,
            retry: false,
            ...config,
        },
    );
};

/**
 * Hook for retrieving a single contact by ID.
 */
export const useGetContactByIdQuery = (
    id: string | null | undefined,
    config?: UseQueryOptions<TContact>,
): QueryObserverResult<TContact> => {
    return useQuery<TContact>(
        [QueryKeys.contact, id],
        () => dataService.getContactById(id as string),
        {
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchOnMount: false,
            retry: false,
            enabled: !!id && (config?.enabled ?? true),
            ...config,
        },
    );
};