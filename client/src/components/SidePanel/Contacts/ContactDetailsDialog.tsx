import { OGDialog, OGDialogTemplate } from '@librechat/client';
import type { TContact } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';

interface ContactDetailsDialogProps {
    contact: TContact | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function ContactDetailsDialog({
    contact,
    open,
    onOpenChange,
}: ContactDetailsDialogProps) {
    const localize = useLocalize();

    if (contact == null){
        return null;
    }

    const coreFields = [
        { label: localize('com_contacts_name'), value: contact.name },
        { label: localize('com_contacts_company'), value: contact.company },
        { label: localize('com_contacts_role'), value: contact.role },
        { label: localize('com_contacts_email'), value: contact.email },
        { label: localize('com_contacts_notes'), value: contact.notes },
    ];
    
    const metadataEntries = Object.entries(contact.metadata ?? {});
    
    return (
        <OGDialog open={open} onOpenChange={onOpenChange}>
            <OGDialogTemplate
                title={contact.name ?? localize('com_ui_details')}
                showCloseButton
                showCancleButton = {false}
                main={
                    <div className="max-h-96 space-y-4 overflow-y-auto pr-1">
                        <div className="space-y-2">
                            {coreFields.map(({label, value }) =>
                                value ? (
                                    <div key={label} className="flex flex-col gap-0.5">
                                        <span className="text-xs font-medium text-text-secondary">{label}</span>
                                        <span className="text-sm text-text-primary">{value}</span>
                                    </div>
                                ) : null
                            )}
                        </div>

                        {metadataEntries.length > 0 && (
                            <div className="space-y-2 border-t pt-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                    {localize('com_contacts_metadata')}
                                </p>
                                {metadataEntries.map(([key, value]) => (
                                    <div key={key} className="flex flex-col gap-0.5">
                                        <span className="text-xs font-medium text-text-secondary">{key}</span>
                                        <span className="text-sm text-text-primary">{String(value ?? '')}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {metadataEntries.length === 0 && (
                            <p className="text-xs text-text-secondary">{localize('com_contacts_no_metadata')}</p>
                        )}
                    </div>
                }
            />
        </OGDialog>
    );
}