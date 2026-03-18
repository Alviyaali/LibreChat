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
import { useDeleteAllContactsMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';

interface DeleteAllDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DeleteAllDialog({ open, onOpenChange }: DeleteAllDialogProps) {
  const localize = useLocalize();
  const { showToast } = useToastContext();

  const { mutate: deleteAll, isLoading } = useDeleteAllContactsMutation({
    onSuccess: () => {
      showToast({ message: localize('com_contacts_delete_all_success'), status: 'success' });
      onOpenChange(false);
    },
    onError: () => {
      showToast({ message: localize('com_ui_error'), status: 'error' });
      onOpenChange(false);
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{localize('com_contacts_delete_all')}</AlertDialogTitle>
          <AlertDialogDescription>
            {localize('com_contacts_delete_all_confirm')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {localize('com_ui_cancel')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => deleteAll()} disabled={isLoading}>
            {isLoading ? <Spinner className="size-4" /> : localize('com_ui_delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
