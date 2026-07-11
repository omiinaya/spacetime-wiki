import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Loader2 } from 'lucide-react';

export default function PermalinkRedirect() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    const anchor = window.location.hash;
    api.pages
      .get(id)
      .then((page) => {
        if (page) navigate(`/page/${page.id}${anchor}`, { replace: true });
        else setError('Page not found');
      })
      .catch(() => setError('Page not found'));
  }, [id, navigate]);

  if (error)
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm font-semibold mb-1">404</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}
