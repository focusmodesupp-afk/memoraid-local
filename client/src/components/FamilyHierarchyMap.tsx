import React from 'react';
import { useI18n } from '../i18n';
import { Heart, Users, Stethoscope } from 'lucide-react';

type FamilyMember = {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  memberTier?: string;
  permissions: string[];
  joinedAt: string;
  userColor?: string | null;
  familyRoles?: string[] | null;
  familyRole?: string | null;
};

type PrimaryPatient = {
  id: string;
  fullName: string;
  photoUrl?: string | null;
} | null;

type Props = {
  primaryPatient: PrimaryPatient;
  members: FamilyMember[];
  onMemberClick?: (member: FamilyMember) => void;
};

const TIER_LABELS = {
  family: { he: 'בני משפחה', en: 'Family Members' },
  supporter_friend: { he: 'חבר/מכר תומך', en: 'Supporting friend' },
  supporter_medical: { he: 'מטפל רפואי', en: 'Medical caregiver' },
};

const SUPPORTER_GROUP_LABEL = { he: 'תומכי משפחה', en: 'Family supporters' };

function MemberAvatar({ member }: { member: FamilyMember }) {
  const initial = member.fullName.charAt(0).toUpperCase();
  const bg = member.userColor ?? '#6366f1';
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
      style={{ backgroundColor: bg }}
    >
      {initial}
    </div>
  );
}

export function FamilyHierarchyMap({ primaryPatient, members, onMemberClick }: Props) {
  const { dir, lang } = useI18n();

  const familyMembers = members.filter(
    (m) => m.memberTier === 'family' || (!m.memberTier && m.role === 'manager')
  );
  const supporterFriends = members.filter((m) => m.memberTier === 'supporter_friend');
  const supporterMedical = members.filter((m) => m.memberTier === 'supporter_medical');
  const supporters = supporterFriends.concat(supporterMedical);

  if (!primaryPatient && familyMembers.length === 0 && supporters.length === 0) {
    return (
      <div dir={dir} className="text-center py-8 text-[hsl(var(--muted-foreground))] text-sm">
        {lang === 'he' ? 'אין נתונים להצגת מפת ההיררכיה' : 'No data to display hierarchy map'}
      </div>
    );
  }

  return (
    <div dir={dir} className="flex flex-col items-center gap-6 py-4">
      {/* 1. מטופל – בראש */}
      {primaryPatient && (
        <div className="flex flex-col items-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-2">
            {lang === 'he' ? 'המטופל' : 'The Patient'}
          </p>
          <div className="rounded-2xl border-2 border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] px-6 py-4 flex items-center gap-4 min-w-[200px] justify-center">
            {primaryPatient.photoUrl ? (
              <img
                src={primaryPatient.photoUrl}
                alt=""
                className="w-14 h-14 rounded-full object-cover border-2 border-[hsl(var(--primary))]"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-[hsl(var(--primary)/0.3)] flex items-center justify-center">
                <Heart className="w-7 h-7 text-[hsl(var(--primary))]" />
              </div>
            )}
            <div>
              <p className="font-bold text-lg text-[hsl(var(--foreground))]">{primaryPatient.fullName}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'מטופל/ת ראשי/ת' : 'Primary patient'}</p>
            </div>
          </div>
        </div>
      )}

      {/* קו מחבר */}
      {(primaryPatient && (familyMembers.length > 0 || supporters.length > 0)) && (
        <div className="w-0.5 h-6 bg-[hsl(var(--border))]" />
      )}

      {/* 2. בני משפחה */}
      {familyMembers.length > 0 && (
        <div className="flex flex-col items-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-2">
            {TIER_LABELS.family[lang]}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {familyMembers.map((m) => (
              <div
                key={m.userId}
                role={onMemberClick ? 'button' : undefined}
                tabIndex={onMemberClick ? 0 : undefined}
                onClick={onMemberClick ? () => onMemberClick(m) : undefined}
                onKeyDown={onMemberClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onMemberClick(m); } } : undefined}
                className={`rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 flex items-center gap-3 shadow-sm transition ${onMemberClick ? 'cursor-pointer hover:shadow-md hover:border-[hsl(var(--primary)/0.5)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]' : ''}`}
              >
                <MemberAvatar member={m} />
                <div>
                  <p className="font-semibold text-sm">{m.fullName}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] truncate max-w-[120px]">{m.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* קו מחבר */}
      {familyMembers.length > 0 && supporters.length > 0 && (
        <div className="w-0.5 h-6 bg-[hsl(var(--border))]" />
      )}

      {/* 3. תומכי משפחה */}
      {supporters.length > 0 && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
            {SUPPORTER_GROUP_LABEL[lang]}
          </p>

          {supporterFriends.length > 0 && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {TIER_LABELS.supporter_friend[lang]}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {supporterFriends.map((m) => (
                  <div
                    key={m.userId}
                    role={onMemberClick ? 'button' : undefined}
                    tabIndex={onMemberClick ? 0 : undefined}
                    onClick={onMemberClick ? () => onMemberClick(m) : undefined}
                    onKeyDown={onMemberClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onMemberClick(m); } } : undefined}
                    className={`rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 flex items-center gap-3 shadow-sm transition ${onMemberClick ? 'cursor-pointer hover:shadow-md hover:border-[hsl(var(--primary)/0.5)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]' : ''}`}
                  >
                    <MemberAvatar member={m} />
                    <div>
                      <p className="font-semibold text-sm">{m.fullName}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] truncate max-w-[120px]">{m.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {supporterMedical.length > 0 && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5" />
                {TIER_LABELS.supporter_medical[lang]}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {supporterMedical.map((m) => (
                  <div
                    key={m.userId}
                    role={onMemberClick ? 'button' : undefined}
                    tabIndex={onMemberClick ? 0 : undefined}
                    onClick={onMemberClick ? () => onMemberClick(m) : undefined}
                    onKeyDown={onMemberClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onMemberClick(m); } } : undefined}
                    className={`rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 flex items-center gap-3 shadow-sm transition ${onMemberClick ? 'cursor-pointer hover:shadow-md hover:border-[hsl(var(--primary)/0.5)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]' : ''}`}
                  >
                    <MemberAvatar member={m} />
                    <div>
                      <p className="font-semibold text-sm">{m.fullName}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] truncate max-w-[120px]">{m.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* אם אין memberTier ממוין – מציגים את כולם כבני משפחה */}
      {members.length > 0 && familyMembers.length === 0 && supporters.length === 0 && (
        <div className="flex flex-col items-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-2">
            {TIER_LABELS.family[lang]}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {members.map((m) => (
              <div
                key={m.userId}
                role={onMemberClick ? 'button' : undefined}
                tabIndex={onMemberClick ? 0 : undefined}
                onClick={onMemberClick ? () => onMemberClick(m) : undefined}
                onKeyDown={onMemberClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onMemberClick(m); } } : undefined}
                className={`rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 flex items-center gap-3 ${onMemberClick ? 'cursor-pointer hover:shadow-md hover:border-[hsl(var(--primary)/0.5)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]' : ''}`}
              >
                <MemberAvatar member={m} />
                <div>
                  <p className="font-semibold text-sm">{m.fullName}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] truncate max-w-[120px]">{m.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
