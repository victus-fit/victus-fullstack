import type React from 'react';
import { motion } from 'motion/react';
import type { AuthUser } from '../../../auth/AuthContext';
import { BiometricsDashboard } from '../../userData/components/BiometricsDashboard';
import { DataLoadingState } from '../../userData/components/DataLoadingState';
import { DietsDashboard } from '../../userData/components/DietsDashboard';
import { ProfileDashboard } from '../../userData/components/ProfileDashboard';
import { WeeklyPlanDashboard } from '../../userData/components/WeeklyPlanDashboard';
import { useHealthOverview } from '../../userData/hooks/useHealthOverview';
import type { AgentWorkspace } from '../../chat/types';

interface WorkspacePageProps {
  workspace: Exclude<AgentWorkspace, 'chat'>;
  user?: AuthUser | null;
}

const labels: Record<Exclude<AgentWorkspace, 'chat'>, { title: string; subtitle: string }> = {
  'meal-log': { title: 'Registro de comidas', subtitle: 'Registro diario de comidas y nutrientes.' },
  'weekly-plan': { title: 'Plan semanal', subtitle: 'Plan elegido para David.' },
  biometrics: { title: 'Biométricas', subtitle: 'Peso, sueño, energía y recuperación.' },
  profile: { title: 'Perfil', subtitle: 'Preferencias, objetivos y contexto personal.' },
};

const workspaceTransition = {
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1] as const,
};

function WorkspaceHeader({ workspace }: Pick<WorkspacePageProps, 'workspace'>) {
  const label = labels[workspace];
  return (
    <header className="workspace-header">
      <div className="header-title">
        <strong>{label.title}</strong>
        <span>{label.subtitle}</span>
      </div>
    </header>
  );
}

export function WorkspacePage({ workspace, user }: WorkspacePageProps) {
  const overview = useHealthOverview();
  const hasDavidWeeklyPlan = user === null || user?.primary_email === 'demo-david@victus.invalid';

  let content: React.ReactNode;
  if (workspace === 'meal-log') {
    content = <div className="workspace-content-shell data-content-shell"><DietsDashboard /></div>;
  } else if (workspace === 'weekly-plan') {
    content = <div className="workspace-content-shell data-content-shell"><WeeklyPlanDashboard hasAssignedPlan={hasDavidWeeklyPlan} /></div>;
  } else if (overview.isLoading) {
    content = <div className="workspace-content-shell"><DataLoadingState /></div>;
  } else if (overview.error || !overview.data) {
    content = (
      <div className="workspace-content-shell">
        <div className="workspace-card">
          <span className="workspace-eyebrow">Victus data</span>
          <h1>No se pudieron cargar los datos</h1>
          <p>{overview.error ?? 'Intenta nuevamente para reconstruir la vista.'}</p>
          <button className="primary-pill" type="button" onClick={() => void overview.refresh()}>Reintentar</button>
        </div>
      </div>
    );
  } else {
    content = (
      <div className="workspace-content-shell data-content-shell">
        {workspace === 'biometrics' ? <BiometricsDashboard overview={overview.data} onMetricCreated={overview.refresh} /> : null}
        {workspace === 'profile' ? <ProfileDashboard overview={overview.data} user={user} /> : null}
      </div>
    );
  }

  return (
    <main className="workspace-main data-main" id="main-content">
      <WorkspaceHeader workspace={workspace} />
      <motion.div
        className="workspace-motion"
        key={workspace}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={workspaceTransition}
      >
        {content}
      </motion.div>
    </main>
  );
}
