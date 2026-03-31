import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { FileText, Plus, Edit, Eye, EyeOff } from 'lucide-react';

type Page = {
  id: string;
  slug: string;
  title: string;
  content: string | null;
  metaDescription: string | null;
  published: boolean;
  locale: string;
  updatedAt: string;
};

export default function AdminCMS() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Page | null>(null);
  const [form, setForm] = useState({ slug: '', title: '', content: '', metaDescription: '', published: false, locale: 'he' });

  function load() {
    setLoading(true);
    apiFetch<Page[]>('/admin/content/pages')
      .then(setPages)
      .catch(() => setPages([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => load(), []);

  async function handleSave() {
    try {
      if (editing) {
        await apiFetch(`/admin/content/pages/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        });
      } else {
        await apiFetch('/admin/content/pages', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      setForm({ slug: '', title: '', content: '', metaDescription: '', published: false, locale: 'he' });
      setEditing(null);
      load();
    } catch (e) {
      console.error(e);
    }
  }

  function startEdit(p: Page) {
    setEditing(p);
    setForm({
      slug: p.slug,
      title: p.title,
      content: p.content ?? '',
      metaDescription: p.metaDescription ?? '',
      published: p.published,
      locale: p.locale,
    });
  }

  async function togglePublished(id: string, published: boolean) {
    try {
      await apiFetch(`/admin/content/pages/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ published }),
      });
      load();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">CMS — ניהול תוכן</h1>
        <button
          onClick={() => {
            setEditing(null);
            setForm({ slug: '', title: '', content: '', metaDescription: '', published: false, locale: 'he' });
          }}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          עמוד חדש
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* טופס */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">{editing ? 'עריכת עמוד' : 'עמוד חדש'}</h2>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Slug (URL)</label>
            <input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="about-us"
              disabled={!!editing}
              className="w-full rounded-lg border border-slate-600 bg-slate-700 text-slate-200 px-3 py-2 text-sm disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">כותרת</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="אודות"
              className="w-full rounded-lg border border-slate-600 bg-slate-700 text-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">תוכן</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="תוכן העמוד..."
              rows={8}
              className="w-full rounded-lg border border-slate-600 bg-slate-700 text-slate-200 px-3 py-2 text-sm resize-none"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Meta Description</label>
            <input
              value={form.metaDescription}
              onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))}
              placeholder="תיאור קצר לSEO..."
              className="w-full rounded-lg border border-slate-600 bg-slate-700 text-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                className="rounded"
              />
              פורסם
            </label>
            <select
              value={form.locale}
              onChange={(e) => setForm((f) => ({ ...f, locale: e.target.value }))}
              className="rounded-lg border border-slate-600 bg-slate-700 text-slate-200 px-3 py-2 text-sm"
            >
              <option value="he">עברית</option>
              <option value="en">English</option>
            </select>
          </div>
          <button
            onClick={handleSave}
            disabled={!form.slug.trim() || !form.title.trim()}
            className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50"
          >
            {editing ? 'עדכן' : 'צור עמוד'}
          </button>
        </div>

        {/* רשימת עמודים */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-slate-200">עמודים ({pages.length})</h2>
          </div>
          {loading ? (
            <div className="px-6 py-12 text-center text-slate-400">טוען...</div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              {pages.length === 0 ? (
                <p className="px-6 py-8 text-center text-slate-500">אין עמודים</p>
              ) : (
                pages.map((p) => (
                  <div key={p.id} className="border-b border-slate-700/50 px-6 py-4 hover:bg-slate-700/20">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-200">{p.title}</p>
                        <p className="text-xs text-slate-500 font-mono">/{p.slug}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(p.updatedAt).toLocaleString('he-IL')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => togglePublished(p.id, !p.published)}
                          className={`p-1.5 rounded ${
                            p.published ? 'bg-green-600/20 text-green-400' : 'bg-slate-700 text-slate-400'
                          }`}
                          title={p.published ? 'פורסם' : 'טיוטה'}
                        >
                          {p.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => startEdit(p)}
                          className="p-1.5 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
