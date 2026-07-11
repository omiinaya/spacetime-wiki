import { useNavigate } from 'react-router-dom';
import { History } from 'lucide-react';
import { ActivityFeed } from '../components/ActivityFeed';

export default function ActivityView() {
  const navigate = useNavigate();
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <History className="h-6 w-6 text-primary" /> Activity
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Recent changes across the wiki — page creates, updates, deletes, and more
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:bg-muted/50 transition-colors"
        >
          Back to home
        </button>
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <ActivityFeed
          limit={200}
          onNavigate={(targetId, eventType) => {
            if (eventType.startsWith('page.') || eventType.startsWith('comment.')) {
              navigate(`/page/${targetId}`);
            } else if (eventType.startsWith('collection.')) {
              navigate(`/?col=${targetId}`);
            }
          }}
        />
      </div>
    </div>
  );
}
