import { useState, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { showToast } from '../components/Toast';

export function useImportExport(userId: string | null, onRefresh: () => void) {
  const [importing, setImporting] = useState(false);
  const [importingNotion, setImportingNotion] = useState(false);
  const [importingConfluence, setImportingConfluence] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const notionImportRef = useRef<HTMLInputElement>(null);
  const confluenceImportRef = useRef<HTMLInputElement>(null);

  const handleImportMD = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setImporting(true);
      try {
        const { markdownToProseMirror } = await import('../lib/helpers');
        const text = await file.text();
        const title = file.name.replace(/\.md$/i, '');
        const doc = markdownToProseMirror(text);
        await api.pages.create(title, JSON.stringify(doc), '', '', userId || 'anonymous');
        showToast({
          type: 'success',
          title: 'Imported',
          message: `"${title}" imported from Markdown`,
          duration: 4000,
        });
      } catch (err) {
        showToast({ type: 'error', title: 'Import failed', message: String(err), duration: 5000 });
      } finally {
        setImporting(false);
        e.target.value = '';
      }
    },
    [userId],
  );

  const handleImportNotion = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setImportingNotion(true);
      try {
        const { htmlToProseMirror, markdownToProseMirror } = await import('../lib/helpers');
        const JSZip = (await import('jszip')).default;

        if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
          const html = await file.text();
          const doc = htmlToProseMirror(html);
          const title = file.name.replace(/\.html?$/i, '');
          await api.pages.create(title, JSON.stringify(doc), '', '', userId || 'anonymous');
          showToast({
            type: 'success',
            title: 'Imported',
            message: `"${title}" imported from HTML`,
            duration: 4000,
          });
          return;
        }

        const zip = await JSZip.loadAsync(file);
        const contentEntries: { path: string; name: string; dir: string; ext: string }[] = [];
        zip.forEach((path, entry) => {
          if (!entry.dir) {
            const parts = path.split('/');
            const filename = parts.pop() || '';
            if (filename.endsWith('.md')) {
              contentEntries.push({
                path,
                name: filename.replace(/\.md$/i, ''),
                dir: parts.join('/'),
                ext: '.md',
              });
            } else if (filename.endsWith('.html') || filename.endsWith('.htm')) {
              contentEntries.push({
                path,
                name: filename.replace(/\.html?$/i, ''),
                dir: parts.join('/'),
                ext: '.html',
              });
            }
          }
        });

        if (contentEntries.length === 0) {
          showToast({
            type: 'error',
            title: 'No pages found',
            message: 'No Markdown or HTML files found',
            duration: 5000,
          });
          return;
        }

        contentEntries.sort((a, b) => a.path.split('/').length - b.path.split('/').length);
        const pageIdsByDir: Record<string, string> = {};
        let created = 0;
        for (const entry of contentEntries) {
          const raw = (await zip.file(entry.path)?.async('string')) || '';
          const doc = entry.ext === '.html' ? htmlToProseMirror(raw) : markdownToProseMirror(raw);
          const parentId = pageIdsByDir[entry.dir] || '';
          const id = await api.pages.create(
            entry.name,
            JSON.stringify(doc),
            '',
            parentId,
            userId || 'anonymous',
          );
          pageIdsByDir[entry.path.replace(/\.\w+$/, '')] = id;
          pageIdsByDir[entry.dir + '/' + entry.name] = id;
          created++;
        }
        showToast({
          type: 'success',
          title: 'Wiki imported',
          message: `Created ${created} pages`,
          duration: 4000,
        });
        onRefresh();
      } catch (err) {
        showToast({ type: 'error', title: 'Import failed', message: String(err), duration: 5000 });
      } finally {
        setImportingNotion(false);
        e.target.value = '';
      }
    },
    [userId, onRefresh],
  );

  const handleImportConfluence = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setImportingConfluence(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('collection_id', '');
        formData.append('created_by', userId || 'anonymous');
        const apiBase = (window as unknown).__API_BASE__ || '/api/v1';
        const res = await fetch(`${apiBase}/import/confluence`, {
          method: 'POST',
          headers: { 'X-API-Key': (window as unknown).__API_KEY__ || '' },
          body: formData,
        });
        if (!res.ok) throw new Error((await res.text()) || `Server error: ${res.status}`);
        const result = await res.json();
        showToast({
          type: 'success',
          title: 'Confluence import complete',
          message: `Created ${result.pages_created || 0} pages`,
          duration: 4000,
        });
        onRefresh();
      } catch (err) {
        showToast({
          type: 'error',
          title: 'Confluence import failed',
          message: String(err),
          duration: 5000,
        });
      } finally {
        setImportingConfluence(false);
        e.target.value = '';
      }
    },
    [userId, onRefresh],
  );

  return {
    importing,
    importingNotion,
    importingConfluence,
    importRef,
    notionImportRef,
    confluenceImportRef,
    handleImportMD,
    handleImportNotion,
    handleImportConfluence,
  };
}
