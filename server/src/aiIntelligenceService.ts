/**
 * AI Intelligence Hub – data aggregation for Admin AI dashboard.
 * Aggregates ai_usage, admin_ai_analyses, dev_tasks for KPIs, costs, leaderboard, insights.
 */
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from './db';
import {
  aiUsage,
  adminAiAnalyses,
  devTasks,
  aiInsights,
} from '../../shared/schemas/schema';

export type DateRange = { from: Date; to: Date };

export function parseDateRange(days?: number, dateFrom?: string, dateTo?: string): DateRange {
  if (dateFrom && dateTo) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
      return { from, to };
    }
  }
  const d = Number(days) || 30;
  const to = new Date();
  const from = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
  return { from, to };
}

/** KPI: total cost, tokens, analyses count, calls count */
export async function getDashboardKpis(range: DateRange) {
  const [usageAgg] = await db
    .select({
      totalCost: sql<string>`COALESCE(SUM(CAST(${aiUsage.costUsd} AS NUMERIC)), 0)`,
      totalTokens: sql<number>`COALESCE(SUM(${aiUsage.tokensUsed}), 0)`,
      totalCalls: sql<number>`COUNT(*)`,
    })
    .from(aiUsage)
    .where(and(gte(aiUsage.createdAt, range.from), lte(aiUsage.createdAt, range.to)));

  const [analysesCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(adminAiAnalyses)
    .where(and(gte(adminAiAnalyses.createdAt, range.from), lte(adminAiAnalyses.createdAt, range.to)));

  return {
    totalCost: parseFloat(usageAgg?.totalCost ?? '0'),
    totalTokens: Number(usageAgg?.totalTokens ?? 0),
    totalCalls: Number(usageAgg?.totalCalls ?? 0),
    totalAnalyses: Number(analysesCount?.count ?? 0),
  };
}

/** Costs by model, optionally by endpoint and admin */
export async function getCostsByModel(
  range: DateRange,
  opts?: { byEndpoint?: boolean; byAdmin?: boolean }
) {
  const baseWhere = and(
    gte(aiUsage.createdAt, range.from),
    lte(aiUsage.createdAt, range.to)
  );

  const rows = await db
    .select({
      model: aiUsage.model,
      endpoint: aiUsage.endpoint,
      adminUserId: aiUsage.adminUserId,
      totalCost: sql<string>`SUM(CAST(${aiUsage.costUsd} AS NUMERIC))`,
      totalTokens: sql<number>`SUM(${aiUsage.tokensUsed})`,
      callCount: sql<number>`COUNT(*)`,
    })
    .from(aiUsage)
    .where(baseWhere)
    .groupBy(aiUsage.model, opts?.byEndpoint ? aiUsage.endpoint : sql`1`, opts?.byAdmin ? aiUsage.adminUserId : sql`1`);

  return rows.map((r) => ({
    model: r.model,
    endpoint: opts?.byEndpoint ? r.endpoint : undefined,
    adminUserId: opts?.byAdmin ? r.adminUserId : undefined,
    totalCost: parseFloat(r.totalCost ?? '0'),
    totalTokens: Number(r.totalTokens ?? 0),
    callCount: Number(r.callCount ?? 0),
  }));
}

/** Model leaderboard: composite score from usage + analyses ratings */
export async function getModelLeaderboard(range: DateRange) {
  const usageByModel = await db
    .select({
      model: aiUsage.model,
      totalCost: sql<string>`SUM(CAST(${aiUsage.costUsd} AS NUMERIC))`,
      totalTokens: sql<number>`SUM(${aiUsage.tokensUsed})`,
      callCount: sql<number>`COUNT(*)`,
    })
    .from(aiUsage)
    .where(and(gte(aiUsage.createdAt, range.from), lte(aiUsage.createdAt, range.to)))
    .groupBy(aiUsage.model);

  const analysesByModel = await db
    .select({
      model: adminAiAnalyses.model,
      avgQuality: sql<string>`AVG(${adminAiAnalyses.outputQuality})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(adminAiAnalyses)
    .where(
      and(
        gte(adminAiAnalyses.createdAt, range.from),
        lte(adminAiAnalyses.createdAt, range.to),
        sql`${adminAiAnalyses.outputQuality} IS NOT NULL`
      )
    )
    .groupBy(adminAiAnalyses.model);

  const qualityMap = new Map<string, number>();
  for (const r of analysesByModel) {
    if (r.model) qualityMap.set(r.model, parseFloat(r.avgQuality ?? '0'));
  }

  const totalCost = usageByModel.reduce((s, r) => s + parseFloat(r.totalCost ?? '0'), 0);
  const leaderboard = usageByModel.map((r) => {
    const cost = parseFloat(r.totalCost ?? '0');
    const quality = qualityMap.get(r.model) ?? 0;
    const costScore = totalCost > 0 ? Math.max(0, 100 - (cost / totalCost) * 100) : 50;
    const qualityScore = quality * 20;
    const composite = Math.round((costScore * 0.3 + qualityScore * 0.7 + 50) / 2);
    return {
      model: r.model,
      totalCost,
      totalTokens: Number(r.totalTokens ?? 0),
      callCount: Number(r.callCount ?? 0),
      avgQualityScore: qualityMap.get(r.model) ?? null,
      compositeScore: Math.min(100, Math.max(0, composite)),
    };
  });

  return leaderboard.sort((a, b) => b.compositeScore - a.compositeScore);
}

/** Admin analysis: per-admin stats (analyses, cost, quality) */
export async function getAdminAnalysis(range: DateRange, adminUserId?: string | null) {
  const baseWhere = and(
    gte(adminAiAnalyses.createdAt, range.from),
    lte(adminAiAnalyses.createdAt, range.to)
  );
  const withAdminFilter = adminUserId ? and(baseWhere, eq(adminAiAnalyses.adminUserId, adminUserId)) : baseWhere;

  const rows = await db
    .select({
      adminUserId: adminAiAnalyses.adminUserId,
      adminFullName: adminAiAnalyses.adminFullName,
      count: sql<number>`COUNT(*)`,
      totalCost: sql<string>`SUM(CAST(COALESCE(${adminAiAnalyses.costUsd}, '0') AS NUMERIC))`,
      avgOutputQuality: sql<string>`AVG(${adminAiAnalyses.outputQuality})`,
      avgDevQuality: sql<string>`AVG(${adminAiAnalyses.devQuality})`,
    })
    .from(adminAiAnalyses)
    .where(withAdminFilter)
    .groupBy(adminAiAnalyses.adminUserId, adminAiAnalyses.adminFullName);

  return rows.map((r) => ({
    adminUserId: r.adminUserId,
    adminFullName: r.adminFullName ?? 'לא ידוע',
    analysisCount: Number(r.count ?? 0),
    totalCost: parseFloat(r.totalCost ?? '0'),
    avgOutputQuality: r.avgOutputQuality ? parseFloat(r.avgOutputQuality) : null,
    avgDevQuality: r.avgDevQuality ? parseFloat(r.avgDevQuality) : null,
  }));
}

/** AI-Dev correlation: analyses count + AI-generated tasks */
export async function getAiDevCorrelation(range: DateRange) {
  const analyses = await db
    .select({ id: adminAiAnalyses.id })
    .from(adminAiAnalyses)
    .where(and(gte(adminAiAnalyses.createdAt, range.from), lte(adminAiAnalyses.createdAt, range.to)));

  const [aiTasks] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(devTasks)
    .where(
      and(
        eq(devTasks.aiGenerated, true),
        gte(devTasks.createdAt, range.from),
        lte(devTasks.createdAt, range.to)
      )
    );

  const totalAiTasks = Number(aiTasks?.count ?? 0);
  const doneColResult = await db.execute(sql`
    SELECT id FROM dev_columns WHERE LOWER(name) = 'done' LIMIT 1
  `);
  const doneId = (doneColResult.rows as { id: string }[])[0]?.id;
  let completedCount = 0;
  if (doneId && totalAiTasks > 0) {
    const [r] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(devTasks)
      .where(
        and(
          eq(devTasks.aiGenerated, true),
          eq(devTasks.columnId, doneId),
          gte(devTasks.createdAt, range.from),
          lte(devTasks.createdAt, range.to)
        )
      );
    completedCount = Number(r?.count ?? 0);
  }

  return {
    analysesCount: analyses.length,
    aiGeneratedTasksCount: totalAiTasks,
    completedTasksCount: completedCount,
    completionRate: totalAiTasks > 0 ? Math.round((completedCount / totalAiTasks) * 100) : 0,
  };
}

/** Automatic insights – from ai_insights table + computed */
export async function getInsights(range: DateRange) {
  const stored = await db
    .select()
    .from(aiInsights)
    .where(
      and(
        eq(aiInsights.isDismissed, false),
        gte(aiInsights.createdAt, range.from)
      )
    )
    .orderBy(desc(aiInsights.createdAt))
    .limit(10);

  const insights: Array<{ type: string; severity: string; title: string; description: string; data?: Record<string, unknown> }> = stored.map((s) => ({
    type: s.insightType,
    severity: s.severity,
    title: s.title,
    description: s.description,
    data: s.data ?? undefined,
  }));

  const usage = await db
    .select({
      totalCost: sql<string>`SUM(CAST(${aiUsage.costUsd} AS NUMERIC))`,
    })
    .from(aiUsage)
    .where(and(gte(aiUsage.createdAt, range.from), lte(aiUsage.createdAt, range.to)));

  const cost = parseFloat(usage[0]?.totalCost ?? '0');
  if (cost > 50 && insights.length < 3) {
    insights.unshift({
      type: 'cost_spike',
      severity: 'info',
      title: 'עלות AI גבוהה',
      description: `סה"כ עלות בתקופה: $${cost.toFixed(2)}. שקול לעבור למודלים זולים יותר לשאלות פשוטות.`,
      data: { totalCost: cost },
    });
  }

  return insights;
}

/** Usage data for pie/bar charts – by model */
export async function getUsageByModel(range: DateRange) {
  const rows = await db
    .select({
      model: aiUsage.model,
      totalCost: sql<string>`SUM(CAST(${aiUsage.costUsd} AS NUMERIC))`,
      totalTokens: sql<number>`SUM(${aiUsage.tokensUsed})`,
      callCount: sql<number>`COUNT(*)`,
    })
    .from(aiUsage)
    .where(and(gte(aiUsage.createdAt, range.from), lte(aiUsage.createdAt, range.to)))
    .groupBy(aiUsage.model);

  return rows.map((r) => ({
    model: r.model,
    cost: parseFloat(r.totalCost ?? '0'),
    tokens: Number(r.totalTokens ?? 0),
    calls: Number(r.callCount ?? 0),
  }));
}

/** Export: full usage rows for CSV */
export async function getExportData(range: DateRange) {
  const usage = await db
    .select({
      id: aiUsage.id,
      model: aiUsage.model,
      tokensUsed: aiUsage.tokensUsed,
      costUsd: aiUsage.costUsd,
      endpoint: aiUsage.endpoint,
      createdAt: aiUsage.createdAt,
    })
    .from(aiUsage)
    .where(and(gte(aiUsage.createdAt, range.from), lte(aiUsage.createdAt, range.to)))
    .orderBy(desc(aiUsage.createdAt))
    .limit(10000);

  return usage;
}
