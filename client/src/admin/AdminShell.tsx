import React, { useEffect } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { AdminThemeProvider } from './hooks/useAdminTheme';
import AdminLogin from './AdminLogin';
import AdminLayout from './AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminFamilies from './pages/AdminFamilies';
import AdminFamilyDetail from './pages/AdminFamilyDetail';
import AdminUsers from './pages/AdminUsers';
import AdminUserDetail from './pages/AdminUserDetail';
import AdminLogs from './pages/AdminLogs';
import AdminSupport from './pages/AdminSupport';
import AdminSubscriptions from './pages/AdminSubscriptions';
import AdminFeatureFlags from './pages/AdminFeatureFlags';
import AdminVersions from './pages/AdminVersions';
import AdminDataCenter from './pages/AdminDataCenter';
import AdminErrors from './pages/AdminErrors';
import AdminCommunication from './pages/AdminCommunication';
import AdminQAControl from './pages/AdminQAControl';
import AdminSettingsAudit from './pages/AdminSettingsAudit';
import AdminSettingsLayer from './pages/AdminSettingsLayer';
import AdminSalesReports from './pages/AdminSalesReports';
import AdminCMS from './pages/AdminCMS';
import AdminMediaLibrary from './pages/AdminMediaLibrary';
import AdminAI from './pages/AdminAI';
import AdminProjectAnalyze from './pages/AdminProjectAnalyze';
import AdminNexusHub from './pages/AdminNexusHub';
import AdminNexusBrief from './pages/AdminNexusBrief';
import AdminNexusSettings from './pages/AdminNexusSettings';
import AdminQARuns from './pages/AdminQARuns';
import AdminQADataQuality from './pages/AdminQADataQuality';
import AdminOKR from './pages/AdminOKR';
import AdminWorkPlan from './pages/AdminWorkPlan';
import AdminPlanner from './pages/AdminPlanner';
import AdminFinance from './pages/AdminFinance';
import AdminPlans from './pages/AdminPlans';
import AdminCoupons from './pages/AdminCoupons';
import AdminStrategies from './pages/AdminStrategies';
import AdminNamespaces from './pages/AdminNamespaces';
import AdminIntegrations from './pages/AdminIntegrations';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminBackups from './pages/AdminBackups';
import AdminNotifications from './pages/AdminNotifications';
import AdminSecurity from './pages/AdminSecurity';
import AdminDevDashboard from './pages/AdminDevDashboard';
import AdminDevKanban from './pages/AdminDevKanban';
import AdminSprints from './pages/AdminSprints';
import AdminSprintDetail from './pages/AdminSprintDetail';
import AdminTaskDistributionSummary from './pages/AdminTaskDistributionSummary';
import AdminPipelines from './pages/AdminPipelines';
import AdminPipelineDetail from './pages/AdminPipelineDetail';
import AdminMedicalInsights from './pages/AdminMedicalInsights';
import { AdminAuthProvider, useAdminAuth } from './AdminAuthContext';

function AdminShellInner() {
  const [location, navigate] = useLocation();
  const { admin, loading } = useAdminAuth();

  useEffect(() => {
    if (loading) return;
    if (location === '/admin/login') return;
    if (!admin) {
      const redirect = location !== '/admin' ? location : '/admin';
      const params = new URLSearchParams();
      params.set('redirect', redirect);
      if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('dev') === '1') {
        params.set('dev', '1');
      }
      navigate(`/admin/login?${params.toString()}`);
      return;
    }
  }, [admin, loading, location, navigate]);

  if (location === '/admin/login') {
    return (
      <AdminThemeProvider>
        <AdminLogin />
      </AdminThemeProvider>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400">
        טוען...
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <AdminThemeProvider>
      <AdminLayout>
        <Switch>
        <Route path="/admin/data-center" component={AdminDataCenter} />
        <Route path="/admin/communication" component={AdminCommunication} />
        <Route path="/admin/qa/control" component={AdminQAControl} />
        <Route path="/admin/qa/errors" component={AdminErrors} />
        <Route path="/admin/settings/audit" component={AdminSettingsAudit} />
        <Route path="/admin/settings/layer" component={AdminSettingsLayer} />
        <Route path="/admin/sales/reports" component={AdminSalesReports} />
        <Route path="/admin/content/cms" component={AdminCMS} />
        <Route path="/admin/content/library" component={AdminMediaLibrary} />
        <Route path="/admin/ai/project-analyze" component={AdminProjectAnalyze} />
        <Route path="/admin/medical-insights" component={AdminMedicalInsights} />
        <Route path="/admin/nexus/settings" component={AdminNexusSettings} />
        <Route path="/admin/nexus/briefs/:id" component={AdminNexusBrief} />
        <Route path="/admin/nexus" component={AdminNexusHub} />
        <Route path="/admin/ai" component={AdminAI} />
        <Route path="/admin/qa/runs" component={AdminQARuns} />
        <Route path="/admin/qa/data-quality" component={AdminQADataQuality} />
        <Route path="/admin/qa/flags" component={AdminFeatureFlags} />
        <Route path="/admin/qa/versions" component={AdminVersions} />
        <Route path="/admin/settings/okr" component={AdminOKR} />
        <Route path="/admin/settings/work-plan" component={AdminWorkPlan} />
        <Route path="/admin/settings/planner" component={AdminPlanner} />
        <Route path="/admin/settings/strategies" component={AdminStrategies} />
        <Route path="/admin/pipelines/:id" component={AdminPipelineDetail} />
        <Route path="/admin/pipelines" component={AdminPipelines} />
        <Route path="/admin/phases/:phaseId/task-summary" component={AdminTaskDistributionSummary} />
        <Route path="/admin/sprints/:id" component={AdminSprintDetail} />
        <Route path="/admin/sprints" component={AdminSprints} />
        <Route path="/admin/dev/dashboard" component={AdminDevDashboard} />
        <Route path="/admin/dev/kanban" component={AdminDevKanban} />
        <Route path="/admin/namespaces" component={AdminNamespaces} />
        <Route path="/admin/integrations" component={AdminIntegrations} />
        <Route path="/admin/analytics" component={AdminAnalytics} />
        <Route path="/admin/backups" component={AdminBackups} />
        <Route path="/admin/notifications" component={AdminNotifications} />
        <Route path="/admin/security" component={AdminSecurity} />
        <Route path="/admin/finance" component={AdminFinance} />
        <Route path="/admin/families/:id" component={AdminFamilyDetail} />
        <Route path="/admin/families" component={AdminFamilies} />
        <Route path="/admin/users/:id" component={AdminUserDetail} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/logs" component={AdminLogs} />
        <Route path="/admin/support" component={AdminSupport} />
        <Route path="/admin/subscriptions" component={AdminSubscriptions} />
        <Route path="/admin/plans/coupons" component={AdminCoupons} />
        <Route path="/admin/plans/promotions" component={AdminCoupons} />
        <Route path="/admin/plans" component={AdminPlans} />
        <Route path="/admin" component={AdminDashboard} />
        <Route component={AdminDashboard} />
        </Switch>
      </AdminLayout>
    </AdminThemeProvider>
  );
}

export default function AdminShell() {
  return (
    <AdminAuthProvider>
      <AdminShellInner />
    </AdminAuthProvider>
  );
}
