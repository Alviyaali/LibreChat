import { useState } from 'react';
import {
    OGDialog,
    OGDialogTemplate,
    Button,
    Label,
    Input,
    useToastContext,
    Spinner,
} from '@librechat/client';
import { useCreateContactMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';

interface ContactFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function ContactFormDialog({ open, onOpenChange }: ContactFormDialogProps) {
    const localize = useLocalize();
    const { showToast } = useToastContext();
    const [name, setName] = useState('');
    const [company, setCompany] = useState('');
    const [role, setRole] = useState('');
    const [email, setEmail] = useState('');
    const [notes, setNotes] = useState('');

    const resetForm = () => {
        setName('');
        setCompany('');
        setRole('');
        setEmail('');
        setNotes('');
    };

    const { mutate: createContact, isLoading } = useCreateContactMutation({
        onSuccess: () => {
            showToast({message: localize('com_contacts_create'), status: 'success'});
            resetForm();
            onOpenChange(false);
        },
        onError: () => {
            showToast({ message: localize('com_contacts_create_error'), status: 'error' });
        },
    });

    const handleSave = () => {
        if (!name.trim()){
            showToast({message: localize('com_contacts_name_required'), status: 'error'});
            return;
        }
        createContact({ name, company, role, email, notes });
    };

    return (
        <OGDialog open={open} onOpenChange={onOpenChange}>
            <OGDialogTemplate
                title={localize('com_contacts_add')}
                showCloseButton
                main={
                    <div className="space-y-3">
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="name">{localize('com_contacts_name')} *</Label>
                            <Input
                                id="contact-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={localize('com_contacts_name')}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label htmlFor ="contact-company">{localize('com_contacts_company')}</Label>
                            <Input
                                id="contact-company"
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                placeholder={localize('com_contacts_company')}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="contact-role">{localize('com_contacts_role')}</Label>
                            <Input
                                id="contact-role"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                placeholder={localize('com_contacts_role')}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="contact-email">{localize('com_contacts_email')}</Label>
                            <Input
                                id="contact-email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={localize('com_contacts_email')}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="contact-notes">{localize('com_contacts_notes')}</Label>
                            <Input
                                id="contact-notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder={localize('com_contacts_notes')}
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                }
                buttons={
                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading ? <Spinner className="size-4" /> : localize('com_ui_save')}
                    </Button>
                }
            />
        </OGDialog>
    );
}