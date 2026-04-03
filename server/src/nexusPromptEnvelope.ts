/**
 * nexusPromptEnvelope.ts
 * Builds structured Prompt Envelopes for NEXUS V2 Meeting Mode.
 *
 * Every AI call in meeting mode uses a 3-layer context envelope:
 *   Layer 1: Canonical Context (project-level, same for everyone)
 *   Layer 2: Round Context (from previous rounds — synthesis, open questions)
 *   Layer 3: Persona Context (per-employee profile, skills, methodology)
 *
 * Output is a structured JSON object that gets serialized into system + user prompts.
 */

import type { WebSource } from './nexusWebIntelligence';

// ── Types ────────────────────────────────────────────────────────────────────

export type PromptEnvelopeOpts = {
  // Layer 1: Canonical
  briefId: string;
  ideaPrompt: string;
  codebaseContext: string;
  knownConstraints: string[];
  contextNotes?: string | null;
  targetPlatforms?: string[] | null;

  // Layer 2: Round
  roundNumber: 1 | 2 | 3;
  protocol: 'ERP' | 'TBP' | 'IPP';
  previousSynthesis?: string | null;
  openQuestions?: Array<{ question: string; target?: string }>;
  decidedConstraints?: string[];

  // Layer 3: Persona
  employee: {
    id?: string;
    name: string;
    roleHe: string;
    department: string;
    level: string;
    bio?: string | null;
    skills: string[];
    domainExpertise?: string[] | null;
    methodology?: string | null;
    personality?: string | null;
    certifications?: string[] | null;
    responsibilities?: string | null;
    education?: string | null;
    experienceYears?: number | null;
    background?: string | null;
  };

  // Web research
  webSources?: WebSource[];

  // Department knowledge
  deptKnowledge?: string;

  // Q&A context
  qaContext?: string;
};

// ── Protocol Missions ────────────────────────────────────────────────────────

const ROUND_MISSIONS: Record<string, Record<string, string>> = {
  // Round 1: ERP — Executive Research Protocol
  ERP: {
    ceo: 'הערך כדאיות עסקית, התאמה לשוק, ROI ויתרון תחרותי. אל תציע פתרונות טכנולוגיים.',
    cto: 'הערך היתכנות טכנית, השפעה על ארכיטקטורה קיימת, סיכוני tech debt וסקיילביליות. אל תקבל החלטות עסקיות.',
    cpo: 'הערך אסטרטגיית מוצר, השפעה על UX, פרסונות משתמש מושפעות, ותעדוף פיצ\'רים. אל תכתוב קוד או specs.',
    security: 'הערך סיכוני אבטחה, OWASP, GDPR, HIPAA, וקטורי תקיפה ודרישות compliance. אל תאשר תקציבים.',
    finance: 'הערך כדאיות פיננסית, עלות-תועלת, break-even, השפעה על ARR ו-unit economics. אל תקבל החלטות מוצריות.',
    marketing: 'הערך השפעה על positioning, GTM, SEO וערוצי שיווק. אל תקבל החלטות טכנולוגיות.',
    legal: 'הערך סיכונים משפטיים, רגולציה, רישיונות OSS ו-privacy compliance. אל תקבל החלטות עסקיות.',
    hr: 'הערך השפעה על צוות, capacity, גיוס ו-retention. אל תקבל החלטות טכנולוגיות.',
    cs: 'הערך השפעה על לקוחות, onboarding, churn ו-support load. אל תקבל החלטות מוצריות.',
    sales: 'הערך השפעה על מכירות, pricing, partnerships ו-sales cycle. אל תקבל החלטות טכנולוגיות.',
    rd: 'הערך ספריות, כלים, גישות מימוש ו-POC feasibility. אל תקבל החלטות אסטרטגיות.',
    design: 'הערך UX/UI impact, design system, accessibility ו-RTL support. אל תקבל החלטות עסקיות.',
    product: 'הערך user stories, acceptance criteria, sprint planning ו-MoSCoW. אל תקבל החלטות טכנולוגיות.',
  },
  // Round 2: TBP — Technical Breakdown Protocol
  TBP: {
    _default: 'תרגם את הכיוון האסטרטגי שהתקבל בישיבת ההנהלה לתכנית טקטית מפורטת עבור התחום שלך. זהה מערכות מושפעות, תלויות, שינויים שוברים, והערכת שעות.',
  },
  // Round 3: IPP — Implementation Planning Protocol
  IPP: {
    _default: 'בהתבסס על כל המחקרים הקודמים, פרט את שלבי המימוש הספציפיים עבור תחום האחריות שלך. כלול: קבצים לשנות, acceptance criteria, do-not-break list, ואסטרטגיית בדיקות.',
  },
};

// ── Forbidden Behaviors per Round ────────────────────────────────────────────

const FORBIDDEN_BEHAVIORS: Record<string, string[]> = {
  ERP: [
    'אסור לכלול פרטי מימוש — ללא קוד, ללא שמות ספריות, ללא נתיבי קבצים',
    'אסור להרחיב scope מעבר למה שהתבקש',
    'אסור להציע טענות ללא מקור או תג "שיקול מקצועי"',
    'אסור לתת ציון ביטחון בלי הסבר',
    'אסור להתעלם מהמערכת הקיימת — חובה להתייחס לארכיטקטורה הנוכחית',
    'אסור להמליץ בלי הערכת סיכונים',
  ],
  TBP: [
    'אסור לשנות את הכיוון האסטרטגי שנקבע ב-Round 1',
    'אסור להוסיף scope מעבר למה שהתבקש',
    'אסור להציע שינויים שוברים בלי migration plan',
    'אסור להציע ספרייה חדשה אם קיימת ספרייה דומה בפרויקט',
    'אסור לתת הערכות כמספר בודד — טווח בלבד',
    'אסור להציע בלי בדיקת תאימות לקוד הקיים',
  ],
  IPP: [
    'אסור ליצור משימות מעל 8 שעות — פצל',
    'אסור ליצור משימות ללא acceptance criteria',
    'אסור ליצור תלויות מעגליות',
    'אסור להתעלם מ-do-not-break list',
    'אסור להציע שינויים שלא עברו אישור ב-Round 1+2',
  ],
};

// ── Mandatory Rules ──────────────────────────────────────────────────────────

const MANDATORY_RULES = [
  'חובה לכלול confidence score (1-5) לכל המלצה',
  'חובה לציין מקורות לכל טענה עובדתית',
  'חובה לרשום "Known Unknowns" — מה לא ניתן היה לקבוע',
  'חובה לבדוק תאימות למערכת הקיימת',
  'חובה להשיב בעברית',
];

// ── Required Output Schemas ──────────────────────────────────────────────────

const OUTPUT_SCHEMA_INSTRUCTIONS: Record<string, string> = {
  ERP: `החזר את הפלט כ-JSON תקין במבנה הבא (executive_finding):
{
  "strategic_assessment": "הערכה אסטרטגית (200-500 מילים)",
  "recommendation": "proceed | proceed_with_caution | investigate_further | reject",
  "confidence_score": 1-5,
  "risks": [{ "description": "...", "severity": "critical|high|medium|low", "probability": "high|medium|low", "impact_area": "business|technical|legal|financial|operational", "mitigation": "...", "source": "URL or professional judgment" }],
  "opportunities": [{ "description": "...", "potential_impact": "...", "confidence": 1-5 }],
  "constraints_identified": ["..."],
  "questions_for_next_round": [{ "target_department": "...", "question": "..." }],
  "known_unknowns": ["..."],
  "compatibility_with_existing": { "score": "compatible|needs_adaptation|breaking", "affected_areas": ["..."], "concerns": ["..."] },
  "key_metrics": { "okrs": ["..."], "kpis": ["..."] },
  "sources": [{ "url": "...", "title": "...", "trust_score": 0-100, "relevance": "..." }]
}`,

  TBP: `החזר את הפלט כ-JSON תקין במבנה הבא (technical_finding):
{
  "executive_directive_response": "איך המחלקה שלך מיישמת את הכיוון האסטרטגי",
  "affected_systems": [{ "system": "...", "files": ["..."], "change_type": "create|modify|delete" }],
  "proposed_approach": "תיאור טכני (300-600 מילים)",
  "dependencies": [{ "on": "...", "type": "blocking|non-blocking", "owner": "...", "risk": "..." }],
  "breaking_changes": [{ "what": "...", "migration_plan": "...", "rollback": "..." }],
  "tools_evaluated": [{ "name": "...", "verdict": "adopt|trial|reject", "reason": "...", "source": "..." }],
  "estimate": { "hours_min": 0, "hours_max": 0, "confidence": "high|medium|low", "assumptions": ["..."] },
  "risks": [],
  "known_unknowns": [],
  "compatibility_report": { "files_affected": ["..."], "safe": true, "concerns": ["..."], "existing_patterns_to_preserve": ["..."] }
}`,

  IPP: `החזר את הפלט כ-JSON תקין במבנה הבא (implementation_detail):
{
  "focus_area": "תחום ההתמקדות שלך",
  "implementation_steps": [{ "step": 1, "description": "...", "files": ["..."], "estimated_hours": 1-8, "depends_on": [], "acceptance_criteria": ["..."] }],
  "code_recommendations": [{ "pattern": "...", "reason": "..." }],
  "do_not_break": [{ "file": "...", "function": "...", "reason": "..." }],
  "test_requirements": [{ "type": "unit|integration|e2e", "description": "..." }],
  "sources": []
}`,
};

// ── Build Prompt Envelope ────────────────────────────────────────────────────

export function buildPromptEnvelope(opts: PromptEnvelopeOpts): {
  systemPrompt: string;
  userPrompt: string;
} {
  const { employee, roundNumber, protocol } = opts;

  // Get mission for this employee
  const missionMap = ROUND_MISSIONS[protocol] ?? {};
  const mission = missionMap[employee.department] ?? missionMap._default ?? 'בצע מחקר מעמיק בתחום האחריות שלך.';

  // Get forbidden behaviors
  const forbidden = FORBIDDEN_BEHAVIORS[protocol] ?? [];

  // Get output schema
  const outputSchema = OUTPUT_SCHEMA_INSTRUCTIONS[protocol] ?? '';

  // ── Build System Prompt ──

  const systemPrompt = `אתה ${employee.roleHe} (${employee.level}) ב-Round ${roundNumber} של NEXUS Meeting Mode.
פרוטוקול: ${protocol}
${employee.bio ? `\nרקע: ${employee.bio}` : ''}
${employee.methodology ? `גישת עבודה: ${employee.methodology}` : ''}
${employee.personality ? `סגנון: ${employee.personality}` : ''}

## המשימה שלך
${mission}

## כללים מחייבים
${MANDATORY_RULES.map(r => `- ${r}`).join('\n')}

## התנהגויות אסורות
${forbidden.map(f => `- ${f}`).join('\n')}`;

  // ── Build User Prompt ──

  const lines: string[] = [];

  // Layer 1: Canonical Context
  lines.push(`# בקשה: ${opts.ideaPrompt}`);
  lines.push('');

  if (opts.contextNotes?.trim()) {
    lines.push(`## הנחיות מיוחדות מהאדמין`);
    lines.push(opts.contextNotes.trim());
    lines.push('');
  }

  if (opts.targetPlatforms && opts.targetPlatforms.length > 0) {
    lines.push(`## פלטפורמות יעד: ${opts.targetPlatforms.join(', ')}`);
    lines.push('');
  }

  lines.push(`## קוד הפרויקט הקיים`);
  lines.push(opts.codebaseContext.slice(0, 4000));
  lines.push('');

  if (opts.knownConstraints.length > 0) {
    lines.push(`## אילוצים ידועים`);
    opts.knownConstraints.forEach(c => lines.push(`- ${c}`));
    lines.push('');
  }

  // Layer 2: Round Context
  if (opts.previousSynthesis) {
    lines.push(`---`);
    lines.push(`## סיכום מהשלב הקודם (Round ${roundNumber - 1})`);
    lines.push(opts.previousSynthesis.slice(0, 6000));
    lines.push('');
  }

  if (opts.openQuestions && opts.openQuestions.length > 0) {
    lines.push(`## שאלות פתוחות שצריך לענות עליהן`);
    opts.openQuestions.forEach((q, i) => {
      const target = q.target ? ` (ליעד: ${q.target})` : '';
      lines.push(`${i + 1}. ${q.question}${target}`);
    });
    lines.push('');
  }

  if (opts.decidedConstraints && opts.decidedConstraints.length > 0) {
    lines.push(`## החלטות שכבר התקבלו (לא לשנות)`);
    opts.decidedConstraints.forEach(c => lines.push(`- ${c}`));
    lines.push('');
  }

  // Layer 3: Persona Context
  lines.push(`---`);
  lines.push(`## הפרופיל שלך`);
  lines.push(`**תפקיד:** ${employee.roleHe} (${employee.level})`);
  if (employee.experienceYears) lines.push(`**ניסיון:** ${employee.experienceYears} שנים`);
  if (employee.education) lines.push(`**השכלה:** ${employee.education}`);
  if (employee.skills.length > 0) lines.push(`**מומחיויות:** ${employee.skills.join(', ')}`);
  if (employee.domainExpertise?.length) lines.push(`**תחומי דומיין:** ${employee.domainExpertise.join(', ')}`);
  if (employee.certifications?.length) lines.push(`**הסמכות:** ${employee.certifications.join(', ')}`);
  if (employee.responsibilities) lines.push(`**אחריות:** ${employee.responsibilities}`);
  if (employee.background) lines.push(`**רקע:** ${employee.background.slice(0, 300)}`);
  lines.push('');

  // Department knowledge
  if (opts.deptKnowledge?.trim()) {
    lines.push(`## ידע מחלקתי`);
    lines.push(opts.deptKnowledge);
    lines.push('');
  }

  // Q&A Context
  if (opts.qaContext?.trim()) {
    lines.push(`## שאלות ותשובות שנאספו`);
    lines.push(opts.qaContext);
    lines.push('');
  }

  // Web Sources
  if (opts.webSources && opts.webSources.length > 0) {
    lines.push(`---`);
    lines.push(`## מקורות מידע מהרשת (${opts.webSources.length} מקורות)`);
    lines.push('| סוג | כותרת | Trust |');
    lines.push('|---|---|---|');
    const qualitySources = opts.webSources.filter(s => s.trustScore >= 20).slice(0, 10);
    qualitySources.forEach(s => {
      const tier = s.trustScore >= 70 ? '🟢' : s.trustScore >= 40 ? '🟡' : '🔴';
      lines.push(`| ${tier} ${s.sourceType} | [${s.title.slice(0, 60)}](${s.url}) | ${s.trustScore}/100 |`);
    });
    lines.push('');
    lines.push('> 🟢 = מקור אמין (70+), 🟡 = בינוני (40-69), 🔴 = נמוך (20-39) — השתמש בזהירות');
    lines.push('');
  }

  // Output instructions
  lines.push(`---`);
  lines.push(`## פורמט הפלט הנדרש`);
  lines.push(outputSchema);
  lines.push('');

  const userPrompt = lines.join('\n');

  return { systemPrompt, userPrompt };
}
