import React from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { ChevronLeft } from 'lucide-react';
import { getBreadcrumbs } from '../adminNavConfig';
import { apiFetch } from '../../lib/api';
import { useAdminAuth } from '../../hooks/useAdminAuth';

function useDetailLabel(path: string): string | undefined {
  const { admin } = useAdminAuth();
  const [, paramsSprint] = useRoute('/admin/sprints/:id');
  const [, paramsFamily] = useRoute('/admin/families/:id');
  const [, paramsUser] = useRoute('/admin/users/:id');
  const [, paramsPipeline] = useRoute('/admin/pipelines/:id');

  const [label, setLabel] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (!admin) return;
    let cancelled = false;

    if (paramsSprint?.id) {
      apiFetch<{ name?: string }>(`/admin/sprints/${paramsSprint.id}`)
        .then((s) => !cancelled && setLabel(s.name ?? `ספרינט ${paramsSprint.id.slice(0, 8)}`))
        .catch(() => !cancelled && setLabel(`ספרינט`));
    } else if (paramsFamily?.id) {
      apiFetch<{ familyName?: string }>(`/admin/families/${paramsFamily.id}`)
        .then((f) => !cancelled && setLabel(f.familyName ?? `משפחה`))
        .catch(() => !cancelled && setLabel(`משפחה`));
    } else if (paramsUser?.id) {
      apiFetch<{ fullName?: string; email?: string }>(`/admin/users/${paramsUser.id}`)
        .then((u) => !cancelled && setLabel(u.fullName ?? u.email ?? `משתמש`))
        .catch(() => !cancelled && setLabel(`משתמש`));
    } else if (paramsPipeline?.id) {
      apiFetch<{ name?: string }>(`/admin/pipelines/${paramsPipeline.id}`)
        .then((p) => !cancelled && setLabel(p.name ?? `Pipeline`))
        .catch(() => !cancelled && setLabel(`Pipeline`));
    } else if (path.includes('/phases/') && path.includes('task-summary')) {
      setLabel('סיכום משימות');
    } else {
      setLabel(undefined);
    }

    return () => {
      cancelled = true;
    };
  }, [admin, path, paramsSprint?.id, paramsFamily?.id, paramsUser?.id, paramsPipeline?.id]);

  return label;
}

export function AdminBreadcrumbs() {
  const [location] = useLocation();
  const detailLabel = useDetailLabel(location);
  const crumbs = React.useMemo(() => getBreadcrumbs(location, detailLabel), [location, detailLabel]);

  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="נתיב ניווט" className="flex items-center gap-1 text-sm text-slate-400 flex-wrap">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <React.Fragment key={crumb.path + i}>
            {i > 0 && (
              <ChevronLeft className="w-4 h-4 shrink-0 text-slate-500" aria-hidden />
            )}
            {isLast ? (
              <span className="text-slate-200 font-medium">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.path}
                className="hover:text-indigo-400 transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
