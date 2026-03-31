import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { FamilyPermissionsPanel } from '../components/FamilyPermissionsPanel';
import { apiFetch } from '../lib/api';
import { useI18n } from '../i18n';

type FamilyMember = {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  permissions: string[];
  joinedAt: string;
};

type FamilyData = {
  id: string;
  familyName: string;
  inviteCode: string;
  primaryPatient?: { id: string; fullName: string; photoUrl?: string | null } | null;
  members: FamilyMember[];
};

export default function FamilyPermissionsPage() {
  const { dir } = useI18n();
  const [, navigate] = useLocation();
  const [data, setData] = useState<FamilyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<FamilyData>('/families/me');
      setData(res);
    } catch (e: any) {
      setError(e.message ?? 'שגיאה');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const goBack = () => navigate('/family');

  if (loading) {
    return (
      <div dir={dir} className="flex items-center justify-center min-h-[40vh]">
        <span className="text-[hsl(var(--muted-foreground))]">טוען...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div dir={dir} className="p-6">
        <p className="text-[hsl(var(--destructive))]">{error}</p>
        <button
          type="button"
          onClick={goBack}
          className="mt-4 px-4 py-2 rounded-lg border hover:bg-[hsl(var(--muted)/0.5)]"
        >
          חזרה
        </button>
      </div>
    );
  }

  return (
    <div dir={dir} className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 sm:p-6 shadow-sm min-h-[400px]">
        <FamilyPermissionsPanel
          members={data.members}
          primaryPatient={data.primaryPatient}
          onClose={goBack}
          onRefresh={load}
          isFullPage
        />
      </div>
    </div>
  );
}
