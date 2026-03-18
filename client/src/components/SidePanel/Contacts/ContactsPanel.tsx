import { useNavigate } from 'react-router-dom';
import { Button } from '@librechat/client';
import { useLocalize } from '~/hooks';

export default function ContactsPanel() {
  const localize = useLocalize();
  const navigate = useNavigate();

  return (
    <div className="flex h-full w-full flex-col items-center justify-start gap-4 pt-4">
      <Button
        variant="outline"
        onClick={() => navigate('/contacts')}
        aria-label={localize('com_contacts_view_all')}
      >
        {localize('com_contacts_view_all')}
      </Button>
    </div>
  );
}
