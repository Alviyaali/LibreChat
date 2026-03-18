import { useState, useEffect } from 'react';
import { Eye, Trash2 } from 'lucide-react';
import {
    Button,
    Spinner,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TooltipAnchor,
} from '@librechat/client';
import type { TContact } from 'librechat-data-provider';
import { useListContactsQuery } from '~/data-provider';
import { useLocalize } from '~/hooks';

import ContactDetailsDialog from './ContactDetailsDialog';
import ContactDeleteDialog from './ContactDeleteDialog';

const PAGE_LIMIT = 20;

interface ContactTableProps {
    search: string;
}

export default function ContactTable({ search }: ContactTableProps) {
    const localize = useLocalize();

    const [currentPage, setCurrentPage] = useState(1);
    const [selectedContact, setSelectedContact] = useState<TContact | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [contactToDelete, setContactToDelete] = useState<TContact | null>(null);

    // Reset pagination whenever search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    const { data, isLoading } = useListContactsQuery({
        search: search.trim() || undefined,
        page: currentPage,
        limit: PAGE_LIMIT,
    });

    const contacts = data?.contacts ?? [];
    const hasPrev = currentPage>1;
    const hasNext = data != null && currentPage<data.totalPages;

    
    const handleNext = () => setCurrentPage((p) => p + 1);
    const handlePrev = () => setCurrentPage((p) => p - 1);

    const handleViewDetails = (contact: TContact) => {
        setSelectedContact(contact);
        setDetailsOpen(true);
    };

    const handleDeleteClick = (contact: TContact) => {
        setContactToDelete(contact);
        setDeleteOpen(true);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Spinner />
            </div>
        );
    }

    if (contacts.length === 0) {
        return (
            <div className="flex items-center justify-center p-8 text-sm text-text-secondary">
                {search
                    ? localize('com_contacts_empty_search')
                    : localize('com_contacts_empty')}
            </div>
        );
    }

    return (
        <>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{localize('com_contacts_name')}</TableHead>
                            <TableHead>{localize('com_contacts_company')}</TableHead>
                            <TableHead>{localize('com_contacts_role')}</TableHead>
                            <TableHead>{localize('com_contacts_email')}</TableHead>
                            <TableHead className="w-[72px]" />
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {contacts.map((contact) => (
                            <TableRow key={contact._id}>
                                <TableCell className="font-medium">
                                    {contact.name ?? '-'}
                                </TableCell>

                                <TableCell>{contact.company ?? '-'}</TableCell>
                                <TableCell>{contact.role ?? '-'}</TableCell>
                                <TableCell>{contact.email ?? '-'}</TableCell>

                                <TableCell className="p-2">
                                    <div className="flex items-center gap-1">

                                        <TooltipAnchor
                                            description={localize('com_contacts_view_details')}
                                            side="top"
                                            render={
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-7"
                                                    aria-label={localize('com_contacts_view_details')}
                                                    onClick={() => handleViewDetails(contact)}
                                                >
                                                    <Eye className="size-3.5" aria-hidden="true" />
                                                </Button>
                                            }
                                        />

                                        <TooltipAnchor
                                            description={localize('com_contacts_delete')}
                                            side="top"
                                            render={
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-7 text-destructive hover:text-destructive/80"
                                                    aria-label={localize('com_contacts_delete')}
                                                    onClick={() => handleDeleteClick(contact)}
                                                >
                                                    <Trash2 className="size-3.5" aria-hidden="true" />
                                                </Button>
                                            }
                                        />

                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {(hasPrev || hasNext) && (
                <div
                    className="flex items-center justify-end gap-2 pt-2"
                    role="navigation"
                    aria-label="Pagination"
                >
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrev}
                        disabled={!hasPrev}
                        aria-label={localize('com_ui_prev')}
                    >
                        {localize('com_ui_prev')}
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNext}
                        disabled={!hasNext}
                        aria-label={localize('com_ui_next')}
                    >
                        {localize('com_ui_next')}
                    </Button>
                </div>
            )}

            <ContactDetailsDialog
                contact={selectedContact}
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
            />

            <ContactDeleteDialog
                contactId={contactToDelete?._id}
                contactName={contactToDelete?.name}
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
            />
        </>
    );
}