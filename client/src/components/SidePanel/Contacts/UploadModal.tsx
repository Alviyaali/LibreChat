import React, { useRef, useState } from 'react';

import {
  OGDialog,
  OGDialogTemplate,
  Button,
  Progress,
  Spinner,
  useToastContext,
} from '@librechat/client';

import { useUploadContactsMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UploadModal({ open, onOpenChange }: UploadModalProps) {
  const localize = useLocalize();
  const { showToast } = useToastContext();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Prevent closing the dialog while an upload is in progress
  const handleClose = (nextOpen: boolean) => {
    if (isLoading) {
      return;
    }

    if (!nextOpen) {
      setSelectedFile(null);
      setUploadProgress(0);
    }

    onOpenChange(nextOpen);
  };

  const { mutate: uploadContacts, isLoading } = useUploadContactsMutation({
    onSuccess: (data) => {
      showToast({
        message: localize('com_contacts_upload_success', {
          count: String(data.count),
        }),
        status: 'success',
      });

      setSelectedFile(null);
      setUploadProgress(0);
      onOpenChange(false);
    },

    onError: () => {
      showToast({
        message: localize('com_contacts_upload_error'),
        status: 'error',
      });

      setUploadProgress(0);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;

    setSelectedFile(file);

    // Reset so the same file can be re-selected if needed
    e.target.value = '';
  };

  const handleUpload = () => {
    if (selectedFile == null) {
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    uploadContacts({
      formData,
      options: {
        onUploadProgress: (percent) => setUploadProgress(percent),
      },
    });
  };

  return (
    <OGDialog open={open} onOpenChange={handleClose}>
      <OGDialogTemplate
        title={localize('com_contacts_upload_csv')}
        showCloseButton={!isLoading}
        showCancelButton={!isLoading}
        main={
          <div className="space-y-4">

            <Button
              variant="outline"
              className="w-full truncate"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              {selectedFile != null
                ? selectedFile.name
                : localize('com_contacts_select_file')}
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
              disabled={isLoading}
            />

            {isLoading && (
              <div className="space-y-1">
                <Progress value={uploadProgress} className="h-2 w-full" />

                <p className="text-center text-xs text-text-secondary">
                  {localize('com_contacts_upload_progress', {
                    percent: String(uploadProgress),
                  })}
                </p>
              </div>
            )}
          </div>
        }

        buttons={
          <Button
            onClick={handleUpload}
            disabled={selectedFile == null || isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Spinner className="size-4" />
                {localize('com_contacts_uploading')}
              </span>
            ) : (
              localize('com_ui_upload')
            )}
          </Button>
        }
      />
    </OGDialog>
  );
}