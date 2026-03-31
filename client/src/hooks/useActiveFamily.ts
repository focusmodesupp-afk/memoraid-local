import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { apiFetch } from '../lib/api';

const STORAGE_KEY = 'mr_active_family';

export function useActiveFamily() {
  const { user, refreshUser } = useAuth();

  const families = user?.families ?? [];
  const effectiveFamilyId = user?.effectiveFamilyId ?? user?.familyId;
  const activeFamilyId = (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null) || effectiveFamilyId || user?.familyId;

  const activeFamily = families.find((f) => f.id === activeFamilyId) ?? families[0];

  useEffect(() => {
    if (effectiveFamilyId && typeof window !== 'undefined' && !localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, effectiveFamilyId);
    }
  }, [effectiveFamilyId]);

  async function setActiveFamily(familyId: string) {
    if (!user || !families.some((f) => f.id === familyId)) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, familyId);
    }
    try {
      await apiFetch('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ primaryFamilyId: familyId }),
      });
      await refreshUser();
    } catch (err) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
      throw err;
    }
  }

  return {
    families,
    activeFamilyId: activeFamilyId ?? undefined,
    activeFamily,
    setActiveFamily,
  };
}
