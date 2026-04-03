import { Router } from 'express';
import { db } from './db';
import { sql } from 'drizzle-orm';
import { getAdminFromRequest } from './adminRoutes';

export const nexusSettingsRoutes = Router();

// Helper: db.execute() returns QueryResult (not array) — extract rows
function rows(r: any): any[] { return r?.rows ?? []; }
function row0(r: any): any  { return r?.rows?.[0] ?? undefined; }

// Convert snake_case object keys to camelCase (for raw SQL responses)
function toCamel(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = v;
  }
  return out;
}
function rowsCamel(r: any): any[] { return rows(r).map(toCamel); }
function row0Camel(r: any): any   { const v = row0(r); return v ? toCamel(v) : undefined; }

// ── Skills ────────────────────────────────────────────────────────────────────

nexusSettingsRoutes.get('/nexus/skills', async (_req, res) => {
  try {
    res.json(rowsCamel(await db.execute(sql`SELECT * FROM nexus_skills ORDER BY category, name`)));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

nexusSettingsRoutes.post('/nexus/skills', async (req, res) => {
  const admin = await getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });
  const { name, labelHe, color, category, description } = req.body;
  if (!name || !labelHe) return res.status(400).json({ error: 'name + labelHe required' });
  try {
    const r = row0Camel(await db.execute(sql`
      INSERT INTO nexus_skills (name, label_he, color, category, description)
      VALUES (${name}, ${labelHe}, ${color ?? '#6366f1'}, ${category ?? 'tech'}, ${description ?? null})
      RETURNING *
    `));
    res.status(201).json(r);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

nexusSettingsRoutes.patch('/nexus/skills/:id', async (req, res) => {
  const admin = await getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });
  const { labelHe, color, category, description, isActive } = req.body;
  try {
    await db.execute(sql`
      UPDATE nexus_skills SET
        label_he  = COALESCE(${labelHe ?? null}, label_he),
        color     = COALESCE(${color ?? null}, color),
        category  = COALESCE(${category ?? null}, category),
        description = COALESCE(${description ?? null}, description),
        is_active = COALESCE(${isActive ?? null}, is_active)
      WHERE id = ${req.params.id}
    `);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

nexusSettingsRoutes.delete('/nexus/skills/:id', async (req, res) => {
  const admin = await getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await db.execute(sql`DELETE FROM nexus_skills WHERE id = ${req.params.id}`);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ── Rules ─────────────────────────────────────────────────────────────────────

nexusSettingsRoutes.get('/nexus/rules', async (_req, res) => {
  try {
    res.json(rowsCamel(await db.execute(sql`SELECT * FROM nexus_rules ORDER BY priority DESC, created_at`)));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

nexusSettingsRoutes.post('/nexus/rules', async (req, res) => {
  const admin = await getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });
  const { name, description, triggerType, conditionJson, actionType, actionPayload, priority } = req.body;
  if (!name || !triggerType || !conditionJson || !actionType) {
    return res.status(400).json({ error: 'name, triggerType, conditionJson, actionType required' });
  }
  try {
    const r = row0Camel(await db.execute(sql`
      INSERT INTO nexus_rules (name, description, trigger_type, condition_json, action_type, action_payload, priority)
      VALUES (${name}, ${description ?? null}, ${triggerType}, ${JSON.stringify(conditionJson)}, ${actionType}, ${JSON.stringify(actionPayload ?? {})}, ${priority ?? 0})
      RETURNING *
    `));
    res.status(201).json(r);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

nexusSettingsRoutes.patch('/nexus/rules/:id', async (req, res) => {
  const admin = await getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });
  const { name, description, triggerType, conditionJson, actionType, actionPayload, priority, isActive } = req.body;
  try {
    await db.execute(sql`
      UPDATE nexus_rules SET
        name           = COALESCE(${name ?? null}, name),
        description    = COALESCE(${description ?? null}, description),
        trigger_type   = COALESCE(${triggerType ?? null}, trigger_type),
        condition_json = COALESCE(${conditionJson ? JSON.stringify(conditionJson) : null}::jsonb, condition_json),
        action_type    = COALESCE(${actionType ?? null}, action_type),
        action_payload = COALESCE(${actionPayload ? JSON.stringify(actionPayload) : null}::jsonb, action_payload),
        priority       = COALESCE(${priority ?? null}, priority),
        is_active      = COALESCE(${isActive ?? null}, is_active),
        updated_at     = now()
      WHERE id = ${req.params.id}
    `);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

nexusSettingsRoutes.delete('/nexus/rules/:id', async (req, res) => {
  const admin = await getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await db.execute(sql`DELETE FROM nexus_rules WHERE id = ${req.params.id}`);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ── Templates ─────────────────────────────────────────────────────────────────

nexusSettingsRoutes.get('/nexus/templates', async (_req, res) => {
  try {
    res.json(rowsCamel(await db.execute(sql`SELECT * FROM nexus_templates WHERE is_active = true ORDER BY is_default DESC, name`)));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

nexusSettingsRoutes.post('/nexus/templates', async (req, res) => {
  const admin = await getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });
  const { name, nameHe, description, departments, models, codebaseDepth, codebaseScope, isDefault } = req.body;
  if (!name || !nameHe || !departments) return res.status(400).json({ error: 'name, nameHe, departments required' });
  try {
    if (isDefault) {
      await db.execute(sql`UPDATE nexus_templates SET is_default = false`);
    }
    const r = row0Camel(await db.execute(sql`
      INSERT INTO nexus_templates (name, name_he, description, departments, models, codebase_depth, codebase_scope, is_default)
      VALUES (${name}, ${nameHe}, ${description ?? null}, ${departments}, ${models ?? []}, ${codebaseDepth ?? 'deep'}, ${codebaseScope ?? 'all'}, ${isDefault ?? false})
      RETURNING *
    `));
    res.status(201).json(r);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

nexusSettingsRoutes.patch('/nexus/templates/:id', async (req, res) => {
  const admin = await getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });
  const { name, nameHe, description, departments, models, codebaseDepth, codebaseScope, isDefault, isActive } = req.body;
  try {
    if (isDefault) {
      await db.execute(sql`UPDATE nexus_templates SET is_default = false`);
    }
    await db.execute(sql`
      UPDATE nexus_templates SET
        name           = COALESCE(${name ?? null}, name),
        name_he        = COALESCE(${nameHe ?? null}, name_he),
        description    = COALESCE(${description ?? null}, description),
        departments    = COALESCE(${departments ?? null}, departments),
        models         = COALESCE(${models ?? null}, models),
        codebase_depth = COALESCE(${codebaseDepth ?? null}, codebase_depth),
        codebase_scope = COALESCE(${codebaseScope ?? null}, codebase_scope),
        is_default     = COALESCE(${isDefault ?? null}, is_default),
        is_active      = COALESCE(${isActive ?? null}, is_active),
        updated_at     = now()
      WHERE id = ${req.params.id}
    `);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

nexusSettingsRoutes.delete('/nexus/templates/:id', async (req, res) => {
  const admin = await getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await db.execute(sql`DELETE FROM nexus_templates WHERE id = ${req.params.id}`);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ── Team Members ──────────────────────────────────────────────────────────────

nexusSettingsRoutes.get('/nexus/team-members', async (req, res) => {
  try {
    const dept = req.query.department as string | undefined;
    const q = dept
      ? sql`SELECT * FROM nexus_dept_team_members WHERE department = ${dept} ORDER BY order_index`
      : sql`SELECT * FROM nexus_dept_team_members ORDER BY department, order_index`;
    res.json(rowsCamel(await db.execute(q)));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

nexusSettingsRoutes.post('/nexus/team-members', async (req, res) => {
  const admin = await getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });
  const { department, name, roleEn, roleHe, emoji, level, responsibilities, skills, defaultModel, systemPromptOverride, orderIndex,
    bio, experienceYears, education, certifications, domainExpertise, languages, methodology, personality, achievements, background, workHistory } = req.body;
  if (!department || !name || !roleEn || !roleHe) return res.status(400).json({ error: 'department, name, roleEn, roleHe required' });
  try {
    const r = row0Camel(await db.execute(sql`
      INSERT INTO nexus_dept_team_members
        (department, name, role_en, role_he, emoji, level, responsibilities, skills, default_model, system_prompt_override, order_index,
         bio, experience_years, education, certifications, domain_expertise, languages, methodology, personality, achievements, background, work_history)
      VALUES
        (${department}, ${name}, ${roleEn}, ${roleHe}, ${emoji ?? '👤'}, ${level ?? 'member'},
         ${responsibilities ?? null}, ${skills ? skills : null}::text[], ${defaultModel ?? null},
         ${systemPromptOverride ?? null}, ${orderIndex ?? 0},
         ${bio ?? null}, ${experienceYears ?? null}, ${education ?? null},
         ${certifications ? certifications : null}::text[], ${domainExpertise ? domainExpertise : null}::text[],
         ${languages ? languages : null}::text[], ${methodology ?? null}, ${personality ?? null},
         ${achievements ?? null}, ${background ?? null}, ${workHistory ? JSON.stringify(workHistory) : '[]'}::jsonb)
      RETURNING *
    `));
    res.status(201).json(r);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

nexusSettingsRoutes.patch('/nexus/team-members/:id', async (req, res) => {
  const admin = await getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });
  const { name, roleHe, emoji, level, responsibilities, skills, defaultModel, systemPromptOverride, isActive, orderIndex,
    bio, experienceYears, education, certifications, domainExpertise, languages, methodology, personality, achievements, background, workHistory } = req.body;
  try {
    await db.execute(sql`
      UPDATE nexus_dept_team_members SET
        name                   = COALESCE(${name ?? null}, name),
        role_he                = COALESCE(${roleHe ?? null}, role_he),
        emoji                  = COALESCE(${emoji ?? null}, emoji),
        level                  = COALESCE(${level ?? null}, level),
        responsibilities       = COALESCE(${responsibilities ?? null}, responsibilities),
        skills                 = COALESCE(${skills ? skills : null}::text[], skills),
        default_model          = COALESCE(${defaultModel ?? null}, default_model),
        system_prompt_override = COALESCE(${systemPromptOverride ?? null}, system_prompt_override),
        is_active              = COALESCE(${isActive ?? null}, is_active),
        order_index            = COALESCE(${orderIndex ?? null}, order_index),
        bio                    = COALESCE(${bio ?? null}, bio),
        experience_years       = COALESCE(${experienceYears ?? null}, experience_years),
        education              = COALESCE(${education ?? null}, education),
        certifications         = COALESCE(${certifications ? certifications : null}::text[], certifications),
        domain_expertise       = COALESCE(${domainExpertise ? domainExpertise : null}::text[], domain_expertise),
        languages              = COALESCE(${languages ? languages : null}::text[], languages),
        methodology            = COALESCE(${methodology ?? null}, methodology),
        personality            = COALESCE(${personality ?? null}, personality),
        achievements           = COALESCE(${achievements ?? null}, achievements),
        background             = COALESCE(${background ?? null}, background),
        work_history           = COALESCE(${workHistory ? JSON.stringify(workHistory) : null}::jsonb, work_history),
        updated_at             = now()
      WHERE id = ${req.params.id}
    `);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

nexusSettingsRoutes.delete('/nexus/team-members/:id', async (req, res) => {
  const admin = await getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await db.execute(sql`DELETE FROM nexus_dept_team_members WHERE id = ${req.params.id}`);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ── Team Member Profile (enriched) ───────────────────────────────────────────

nexusSettingsRoutes.get('/nexus/team-members/:id/profile', async (req, res) => {
  try {
    const member = row0Camel(await db.execute(sql`SELECT * FROM nexus_dept_team_members WHERE id = ${req.params.id}`));
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const dept = member.department as string;

    // Load all related entities in parallel
    const [knowledgeR, deptSettingR, rulesR, templatesR, webFeedsR, colleaguesR] = await Promise.all([
      db.execute(sql`SELECT * FROM nexus_dept_knowledge WHERE department = ${dept} AND is_active = true ORDER BY position`),
      db.execute(sql`SELECT * FROM nexus_dept_settings WHERE department = ${dept}`),
      db.execute(sql`SELECT * FROM nexus_rules WHERE is_active = true ORDER BY priority DESC`),
      db.execute(sql`SELECT * FROM nexus_templates WHERE is_active = true ORDER BY usage_count DESC`),
      db.execute(sql`SELECT * FROM nexus_web_feeds WHERE is_active = true ORDER BY category, label`),
      db.execute(sql`SELECT * FROM nexus_dept_team_members WHERE department = ${dept} AND id != ${req.params.id} AND is_active = true ORDER BY order_index`),
    ]);

    // Filter templates that include this department
    const allTemplates = rowsCamel(templatesR);
    const templates = allTemplates.filter((t: any) => Array.isArray(t.departments) && t.departments.includes(dept));

    // Filter web feeds scoped to this department (null departments = all depts)
    const allFeeds = rowsCamel(webFeedsR);
    const webFeeds = allFeeds.filter((f: any) => !f.departments || (Array.isArray(f.departments) && f.departments.includes(dept)));

    // Get model routes
    let modelRoutes = {};
    try {
      const { getAllModelRoutes } = await import('./modelRouter');
      modelRoutes = getAllModelRoutes();
    } catch { /* modelRouter not available */ }

    res.json({
      member,
      knowledge: rowsCamel(knowledgeR),
      deptSetting: row0Camel(deptSettingR),
      rules: rowsCamel(rulesR),
      templates,
      webFeeds,
      colleagues: rowsCamel(colleaguesR),
      modelRoutes,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

nexusSettingsRoutes.get('/nexus/team-members/:id/contributions', async (req, res) => {
  try {
    const member = row0Camel(await db.execute(sql`SELECT department FROM nexus_dept_team_members WHERE id = ${req.params.id}`));
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const contributions = rowsCamel(await db.execute(sql`
      SELECT d.brief_id, b.title AS brief_title, b.created_at,
             d.tokens_used, d.cost_usd, d.status, d.model_used
      FROM nexus_brief_departments d
      JOIN nexus_briefs b ON b.id = d.brief_id
      WHERE d.department = ${member.department} AND d.status = 'completed'
      ORDER BY b.created_at DESC
      LIMIT 50
    `));

    // Count tasks generated from this department
    let totalTasks = 0;
    try {
      const taskCountR = await db.execute(sql`
        SELECT COUNT(*) as cnt FROM nexus_extracted_tasks
        WHERE source_department = ${member.department}
      `);
      totalTasks = parseInt(taskCountR.rows?.[0]?.cnt ?? '0', 10);
    } catch { /* table may not exist */ }

    const stats = {
      totalBriefs: contributions.length,
      totalTokens: contributions.reduce((s: number, c: any) => s + (c.tokensUsed ?? 0), 0),
      totalCost: contributions.reduce((s: number, c: any) => s + (parseFloat(c.costUsd) || 0), 0),
      totalTasks,
    };

    res.json({ contributions, stats });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Prompt Preview ───────────────────────────────────────────────────────────

nexusSettingsRoutes.get('/nexus/team-members/:id/prompt-preview', async (req, res) => {
  try {
    const member = row0Camel(await db.execute(sql`SELECT * FROM nexus_dept_team_members WHERE id = ${req.params.id}`));
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const dept = member.department as string;

    // Load all context needed for prompt preview
    const [deptSettingR, knowledgeR, skillsR, colleaguesR] = await Promise.all([
      db.execute(sql`SELECT * FROM nexus_dept_settings WHERE department = ${dept}`),
      db.execute(sql`SELECT * FROM nexus_dept_knowledge WHERE department = ${dept} AND is_active = true ORDER BY position`),
      db.execute(sql`SELECT * FROM nexus_skills WHERE is_active = true ORDER BY category, name`),
      db.execute(sql`SELECT * FROM nexus_dept_team_members WHERE department = ${dept} AND is_active = true ORDER BY order_index`),
    ]);

    const deptSetting = row0Camel(deptSettingR);
    const knowledge = rowsCamel(knowledgeR);
    const skills = rowsCamel(skillsR);
    const colleagues = rowsCamel(colleaguesR);

    // Build system prompt source
    let systemPromptSource = 'hardcoded';
    let systemPrompt = '';
    try {
      const { DEPARTMENT_CONFIGS } = await import('./nexusDepartmentAgents');
      systemPrompt = (DEPARTMENT_CONFIGS as any)?.[dept]?.systemPrompt ?? '';
    } catch { /* fallback */ }
    if (deptSetting?.systemPromptOverride?.trim()) {
      systemPrompt = deptSetting.systemPromptOverride;
      systemPromptSource = 'db_override';
    }

    // Build team block (same logic as nexusDepartmentAgents)
    const teamBlock = colleagues.length > 0
      ? `## 👥 צוות המחלקה שלך (${colleagues.length} חברים)\n${colleagues.map((m: any) => {
          let line = `### ${m.roleHe} (${m.level})`;
          if (m.experienceYears) line += ` — ${m.experienceYears} שנות ניסיון`;
          if (m.bio) line += `\n${m.bio}`;
          if (m.education) line += `\n- **השכלה:** ${m.education}`;
          if (m.background) line += `\n- **רקע:** ${(m.background ?? '').slice(0, 300)}`;
          const sk = Array.isArray(m.skills) ? m.skills : [];
          if (sk.length) line += `\n- **מומחיויות:** ${sk.join(', ')}`;
          const de = Array.isArray(m.domainExpertise) ? m.domainExpertise : [];
          if (de.length) line += `\n- **תחומי דומיין:** ${de.join(', ')}`;
          if (m.responsibilities) line += `\n- **אחריות:** ${m.responsibilities}`;
          if (m.methodology) line += `\n- **גישת עבודה:** ${m.methodology}`;
          if (m.personality) line += ` | **סגנון:** ${m.personality}`;
          const certs = Array.isArray(m.certifications) ? m.certifications : [];
          if (certs.length) line += `\n- **הסמכות:** ${certs.join(', ')}`;
          return line;
        }).join('\n\n')}\n\n> קח בחשבון את הרקע, הניסיון, המומחיויות וגישת העבודה של כל חבר צוות בהמלצותיך.`
      : '';

    // Build knowledge block
    const knowledgeBlock = knowledge.length > 0
      ? `## 📚 ידע פנימי של המחלקה\n${knowledge.map((k: any) => `### ${k.title} (${k.category})\n${k.content}`).join('\n\n')}`
      : '';

    // Build skills block
    const skillsBlock = skills.length > 0
      ? `## 🛠️ Skills רלוונטיים לפרויקט\n${skills.map((s: any) => `- **${s.labelHe}** (\`${s.name}\`) — ${s.category}`).join('\n')}`
      : '';

    // Calculate quality score
    const m = member as any;
    const checks = [
      { field: 'bio', points: 10, filled: !!m.bio },
      { field: 'experienceYears', points: 5, filled: (m.experienceYears ?? 0) > 0 },
      { field: 'education', points: 10, filled: !!m.education },
      { field: 'background', points: 10, filled: !!m.background },
      { field: 'skills', points: 10, filled: Array.isArray(m.skills) && m.skills.length > 0 },
      { field: 'domainExpertise', points: 10, filled: Array.isArray(m.domainExpertise) && m.domainExpertise.length > 0 },
      { field: 'certifications', points: 5, filled: Array.isArray(m.certifications) && m.certifications.length > 0 },
      { field: 'responsibilities', points: 10, filled: !!m.responsibilities },
      { field: 'methodology', points: 5, filled: !!m.methodology },
      { field: 'personality', points: 5, filled: !!m.personality },
      { field: 'achievements', points: 5, filled: !!m.achievements },
      { field: 'systemPromptOverride', points: 5, filled: !!m.systemPromptOverride },
      { field: 'deptKnowledge', points: 10, filled: knowledge.length > 0 },
    ];
    const score = checks.reduce((sum, c) => sum + (c.filled ? c.points : 0), 0);

    res.json({
      systemPrompt,
      systemPromptSource,
      teamBlock,
      knowledgeBlock,
      skillsBlock,
      qualityScore: score,
      qualityChecks: checks,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Department Settings ────────────────────────────────────────────────────────

nexusSettingsRoutes.get('/nexus/dept-settings', async (_req, res) => {
  try {
    res.json(rowsCamel(await db.execute(sql`SELECT * FROM nexus_dept_settings ORDER BY department`)));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

nexusSettingsRoutes.put('/nexus/dept-settings/:department', async (req, res) => {
  const admin = await getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });
  const dept = req.params.department;
  const { labelHe, emoji, systemPromptOverride, defaultModel, isActive, outputSections } = req.body;
  if (!labelHe) return res.status(400).json({ error: 'labelHe required' });
  try {
    await db.execute(sql`
      INSERT INTO nexus_dept_settings (department, label_he, emoji, system_prompt_override, default_model, is_active, output_sections)
      VALUES (${dept}, ${labelHe}, ${emoji ?? '🏢'}, ${systemPromptOverride ?? null}, ${defaultModel ?? null}, ${isActive ?? true}, ${outputSections ? JSON.stringify(outputSections) : null}::jsonb)
      ON CONFLICT (department) DO UPDATE SET
        label_he               = EXCLUDED.label_he,
        emoji                  = EXCLUDED.emoji,
        system_prompt_override = EXCLUDED.system_prompt_override,
        default_model          = EXCLUDED.default_model,
        is_active              = EXCLUDED.is_active,
        output_sections        = EXCLUDED.output_sections,
        updated_at             = now()
    `);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ── Web Feeds ──────────────────────────────────────────────────────────────────

nexusSettingsRoutes.get('/nexus/web-feeds', async (req, res) => {
  try {
    const { sourceType, department } = req.query as Record<string, string | undefined>;
    let q: ReturnType<typeof sql>;
    if (sourceType && department) {
      q = sql`SELECT * FROM nexus_web_feeds WHERE source_type = ${sourceType} AND (departments IS NULL OR ${department} = ANY(departments)) ORDER BY source_type, label`;
    } else if (sourceType) {
      q = sql`SELECT * FROM nexus_web_feeds WHERE source_type = ${sourceType} ORDER BY label`;
    } else if (department) {
      q = sql`SELECT * FROM nexus_web_feeds WHERE departments IS NULL OR ${department} = ANY(departments) ORDER BY source_type, label`;
    } else {
      q = sql`SELECT * FROM nexus_web_feeds ORDER BY source_type, label`;
    }
    res.json(rowsCamel(await db.execute(q)));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

nexusSettingsRoutes.post('/nexus/web-feeds', async (req, res) => {
  const admin = await getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });
  const { sourceType, url, label, category, departments } = req.body;
  if (!sourceType || !url || !label) return res.status(400).json({ error: 'sourceType, url, label required' });
  try {
    const r = row0Camel(await db.execute(sql`
      INSERT INTO nexus_web_feeds (source_type, url, label, category, departments)
      VALUES (${sourceType}, ${url}, ${label}, ${category ?? 'tech'}, ${departments ? departments : null}::text[])
      ON CONFLICT (url) DO UPDATE SET
        label       = EXCLUDED.label,
        category    = EXCLUDED.category,
        departments = EXCLUDED.departments,
        updated_at  = now()
      RETURNING *
    `));
    res.status(201).json(r);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

nexusSettingsRoutes.patch('/nexus/web-feeds/:id', async (req, res) => {
  const admin = await getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });
  const { label, category, departments, isActive } = req.body;
  try {
    await db.execute(sql`
      UPDATE nexus_web_feeds SET
        label       = COALESCE(${label ?? null}, label),
        category    = COALESCE(${category ?? null}, category),
        departments = COALESCE(${departments ? departments : null}::text[], departments),
        is_active   = COALESCE(${isActive ?? null}, is_active),
        updated_at  = now()
      WHERE id = ${req.params.id}
    `);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

nexusSettingsRoutes.delete('/nexus/web-feeds/:id', async (req, res) => {
  const admin = await getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await db.execute(sql`DELETE FROM nexus_web_feeds WHERE id = ${req.params.id}`);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ── Department Knowledge Base ────────────────────────────────────────────────

nexusSettingsRoutes.get('/nexus/dept-knowledge', async (req, res) => {
  try {
    const { department, category } = req.query as Record<string, string | undefined>;
    let q;
    if (department && category) {
      q = sql`SELECT * FROM nexus_dept_knowledge WHERE department = ${department} AND category = ${category} ORDER BY position, created_at`;
    } else if (department) {
      q = sql`SELECT * FROM nexus_dept_knowledge WHERE department = ${department} ORDER BY category, position, created_at`;
    } else {
      q = sql`SELECT * FROM nexus_dept_knowledge ORDER BY department, category, position, created_at`;
    }
    res.json(rows(await db.execute(q)).map(toCamel));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

nexusSettingsRoutes.post('/nexus/dept-knowledge', async (req, res) => {
  const admin = await getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { department, category, title, content, position } = req.body;
    if (!department || !category || !title || !content) {
      return res.status(400).json({ error: 'department, category, title, content required' });
    }
    const r = await db.execute(sql`
      INSERT INTO nexus_dept_knowledge (department, category, title, content, position)
      VALUES (${department}, ${category}, ${title}, ${content}, ${position ?? 0})
      RETURNING *
    `);
    res.status(201).json(toCamel(row0(r)));
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

nexusSettingsRoutes.put('/nexus/dept-knowledge/:id', async (req, res) => {
  const admin = await getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { title, content, category, isActive, position } = req.body;
    await db.execute(sql`
      UPDATE nexus_dept_knowledge SET
        title = COALESCE(${title ?? null}, title),
        content = COALESCE(${content ?? null}, content),
        category = COALESCE(${category ?? null}, category),
        is_active = COALESCE(${isActive ?? null}, is_active),
        position = COALESCE(${position ?? null}, position),
        updated_at = now()
      WHERE id = ${req.params.id}
    `);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

nexusSettingsRoutes.delete('/nexus/dept-knowledge/:id', async (req, res) => {
  const admin = await getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await db.execute(sql`DELETE FROM nexus_dept_knowledge WHERE id = ${req.params.id}`);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ── Model Routing Info ───────────────────────────────────────────────────────

nexusSettingsRoutes.get('/nexus/model-routes', async (_req, res) => {
  try {
    const { getAllModelRoutes } = await import('./modelRouter');
    res.json(getAllModelRoutes());
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
