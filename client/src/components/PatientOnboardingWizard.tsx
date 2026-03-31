import React from 'react';
import { useI18n } from '../i18n';
import { ChevronRight, ChevronLeft, User, Stethoscope, Pill, Phone, Shield, Heart } from 'lucide-react';

const STEPS = [
  { key: 1, icon: User, labelHe: 'פרטים בסיסיים', labelEn: 'Basic details' },
  { key: 2, icon: Stethoscope, labelHe: 'מידע רפואי', labelEn: 'Medical info' },
  { key: 3, icon: Pill, labelHe: 'תרופות', labelEn: 'Medications' },
  { key: 4, icon: Phone, labelHe: 'אנשי קשר', labelEn: 'Contacts' },
  { key: 5, icon: Shield, labelHe: 'ביטוח', labelEn: 'Insurance' },
  { key: 6, icon: Heart, labelHe: 'העדפות', labelEn: 'Preferences' },
] as const;

type Props = {
  currentStep: number;
  completionScore: number;
  onStepChange: (step: number) => void;
  children: React.ReactNode;
};

export default function PatientOnboardingWizard({ currentStep, completionScore, onStepChange, children }: Props) {
  const { lang } = useI18n();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
            {lang === 'he' ? 'התקדמות הקמת פרופיל' : 'Profile setup progress'}
          </span>
          <span className="text-sm font-semibold text-[hsl(var(--primary))]">{completionScore}%</span>
        </div>
        <div className="h-2 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
          <div
            className="h-full bg-[hsl(var(--primary))] transition-all duration-300"
            style={{ width: `${completionScore}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          const isActive = s.key === currentStep;
          const isPast = s.key < currentStep;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onStepChange(s.key)}
              className={`flex items-center gap-1.5 shrink-0 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-[hsl(var(--primary))] text-white'
                  : isPast
                    ? 'bg-[hsl(var(--primary))/0.2)] text-[hsl(var(--primary))]'
                    : 'bg-[hsl(var(--muted))]/50 text-[hsl(var(--muted-foreground))]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{lang === 'he' ? s.labelHe : s.labelEn}</span>
              {idx < STEPS.length - 1 && <ChevronLeft className="w-3.5 h-3.5 opacity-70" />}
            </button>
          );
        })}
      </div>

      {children}
    </div>
  );
}
