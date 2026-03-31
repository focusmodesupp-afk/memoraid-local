import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { SECTIONS, dtoToNavSections, type NavSection } from '../adminNavConfig';

type NavMenuResponse = { sections: { id: string; label: string; items: { path: string; label: string; icon: string }[] }[] };

export function useAdminNavigation(): NavSection[] {
  const [sections, setSections] = useState<NavSection[]>(SECTIONS);

  useEffect(() => {
    apiFetch<NavMenuResponse>('/admin/navigation-menu')
      .then((data) => setSections(dtoToNavSections(data.sections)))
      .catch(() => setSections(SECTIONS));
  }, []);

  return sections;
}
