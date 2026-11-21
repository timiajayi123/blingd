'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { HardDrive, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type Asset = { id: string; name: string; path: string; url: string; thumbnail?: string; type?: string; size?: number; createdAt?: string };
const sources = [
  { id: 'imagekit', label: 'ImageKit' },
  { id: 'media', label: 'Appwrite media' },
  { id: 'proofs', label: 'Order proofs' },
];

export default function StoragePage() {
  const [source, setSource] = useState('imagekit');
  const [files, setFiles] = useState<Asset[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState('');
  const requestId = useRef(0);
  const load = useCallback(async (nextOffset = 0) => {
    const currentRequest = ++requestId.current;
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/admin/storage?source=${encodeURIComponent(source)}&offset=${nextOffset}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load files.');
      if (currentRequest !== requestId.current) return;
      setFiles((current) => nextOffset ? [...current, ...data.files] : data.files);
      setOffset(data.nextOffset); setHasMore(data.hasMore);
    } catch (err) { if (currentRequest === requestId.current) setError(err instanceof Error ? err.message : 'Could not load files.'); }
    finally { if (currentRequest === requestId.current) setLoading(false); }
  }, [source]);
  useEffect(() => { setFiles([]); setHasMore(false); void load(); }, [load]);

  async function remove(file: Asset) {
    if (!window.confirm(`Permanently delete ${file.name}? Pages, products, or orders using this file may stop displaying it.`)) return;
    setDeleting(file.id);
    try {
      const response = await fetch('/api/admin/storage', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source, id: file.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not delete file.');
      setFiles((current) => current.filter((item) => item.id !== file.id)); toast.success('File deleted.');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not delete file.'); }
    finally { setDeleting(''); }
  }

  return <div className="space-y-8 pb-20">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Media library</p><h1 className="mt-2 text-4xl font-bold tracking-tight">Storage</h1><p className="mt-3 text-sm text-zinc-500">Browse images, videos and other files. Check where a file is used before deleting it.</p></div><button onClick={() => void load()} className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold"><RefreshCw size={16} /> Refresh</button></header>
    <div className="flex flex-wrap gap-2">{sources.map((item) => <button key={item.id} onClick={() => setSource(item.id)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${source === item.id ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-600'}`}>{item.label}</button>)}</div>
    {source === 'imagekit' && <p className="text-xs text-zinc-500">Shows files in BLING’D folders. Other ImageKit folders are excluded. Use Load more to scan the next page.</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {!files.length && !loading && !error && <div className="rounded-2xl border border-zinc-100 p-12 text-center text-sm text-zinc-400"><HardDrive className="mx-auto mb-3" />No files on this page.{hasMore ? ' Load more to continue.' : ''}</div>}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{files.map((file) => {
      const type = (file.type || '').toLowerCase();
      const image = type.startsWith('image') || /\.(png|jpe?g|webp|gif|avif)$/i.test(file.name);
      const video = type.startsWith('video') || /\.(mp4|webm|mov)$/i.test(file.name);
      return <article key={file.id} className="overflow-hidden rounded-2xl border border-zinc-100 bg-white"><div className="flex h-48 items-center justify-center bg-zinc-50">{image ? <img src={file.thumbnail || file.url} alt={file.name} className="h-full w-full object-contain" loading="lazy" /> : video ? <video src={file.url} controls preload="metadata" className="h-full w-full object-contain" /> : <HardDrive className="text-zinc-300" />}</div><div className="space-y-2 p-4"><p className="break-all text-sm font-semibold">{file.name}</p><p className="break-all text-xs text-zinc-400">{file.path} · {file.size != null ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Size unavailable'}</p><div className="flex items-center justify-between pt-2"><a href={file.url} target="_blank" rel="noreferrer" className="text-xs font-semibold underline">Open file</a><button onClick={() => void remove(file)} disabled={deleting === file.id} className="flex items-center gap-1 text-xs font-semibold text-red-600 disabled:opacity-50"><Trash2 size={14} /> Delete</button></div></div></article>;
    })}</div>
    {hasMore && <button disabled={loading} onClick={() => void load(offset)} className="rounded-xl border px-5 py-3 text-sm font-semibold disabled:opacity-50">{loading ? 'Loading…' : 'Load more'}</button>}
    {loading && !files.length && <p className="text-sm text-zinc-500">Loading files…</p>}
  </div>;
}
