import { useParams } from 'react-router-dom';
import { PageView } from './PageView';

export default function PageViewWrapper({ userId }: { userId: string | null }) {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <PageView pageId={id} userId={userId} />;
}
