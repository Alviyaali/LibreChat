import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    Spinner,
    useToastContext,
} from '@librechat/client';
import { useDeleteContactMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';

interface ContactDeleteDialogProps {
    contactId: string | undefined;
    contactName: string | undefined;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function ContactDetailsDialog({
    contactId,
    contactName,
    open,
    onOpenChange,
}: ContactDeleteDialogProps) {
    const localize = useLocalize();
    const { showToast } = useToastContext();

    const { mutate: deleteContact, isLoading } = useDeleteContactMutation({
        onSuccess: () => {
            showToast({ message: localize('com_ui_contact_deleted'), status: 'success' });
            onOpenChange(false);
        },
        onError: () => {
            showToast({ message: localize('com_ui_error'), status: 'error' });
            onOpenChange(false);
        },
    });

    const handleConfirm = () => {
        if (!contactId){
            return;
        }
        deleteContact(contactId);
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{localize('com_contacts_delete')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {localize('com_contacts_delete_confirm', { name: contactName ?? '' })}{' '}
                        {localize('com_contacts_delete_description')}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>
                        {localize('com_ui_cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirm} disabled={isLoading}>
                        {isLoading ? <Spinner className="size-4" /> : localize('com_ui_delete')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

