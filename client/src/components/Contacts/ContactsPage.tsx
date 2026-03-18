import { useState } from 'react';
import { UserPlus, Upload, Trash2 } from 'lucide-react';
import { Button, FilterInput, TooltipAnchor } from '@librechat/client';
import { useLocalize, useDebounce } from '~/hooks';
import ContactFormDialog from '~/components/SidePanel/Contacts/ContactFormDialog';
import ContactTable from '~/components/SidePanel/Contacts/ContactTable';
import UploadModal from '~/components/SidePanel/Contacts/UploadModal';
import DeleteAllDialog from './DeleteAllDialog';

export default function ContactsPage() {
  const localize = useLocalize();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-surface-primary text-text-primary">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-4 overflow-y-auto p-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-text-primary">
            {localize('com_sidepanel_contacts')}
          </h1>
        </div>

        <div
          role="region"
          aria-label={localize('com_sidepanel_contacts')}
          className="flex flex-col gap-4"
        >
          <div className="flex items-center gap-2">
            <FilterInput
              inputId="contacts-page-filter"
              label={localize('com_contacts_search_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              containerClassName="flex-1"
            />
            <TooltipAnchor
              description={localize('com_contacts_add')}
              side="bottom"
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 bg-transparent"
                  aria-label={localize('com_contacts_add')}
                  onClick={() => setAddOpen(true)}
                >
                  <UserPlus className="size-4" aria-hidden="true" />
                </Button>
              }
            />
            <TooltipAnchor
              description={localize('com_contacts_upload_csv')}
              side="bottom"
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 bg-transparent"
                  aria-label={localize('com_contacts_upload_csv')}
                  onClick={() => setUploadOpen(true)}
                >
                  <Upload className="size-4" aria-hidden="true" />
                </Button>
              }
            />
            <TooltipAnchor
              description={localize('com_contacts_delete_all')}
              side="bottom"
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 bg-transparent text-destructive hover:text-destructive/80"
                  aria-label={localize('com_contacts_delete_all')}
                  onClick={() => setDeleteAllOpen(true)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              }
            />
          </div>

          <div className="min-h-0 flex-1">
            <ContactTable search={debouncedSearch} />
          </div>
        </div>
      </div>

      <ContactFormDialog open={addOpen} onOpenChange={setAddOpen} />
      <UploadModal open={uploadOpen} onOpenChange={setUploadOpen} />
      <DeleteAllDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen} />
    </div>
  );
}
