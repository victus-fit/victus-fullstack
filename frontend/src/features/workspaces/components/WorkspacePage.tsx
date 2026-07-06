import type React from 'react';
import { FileText, Moon, PanelLeftClose, PanelLeftOpen, Sun, type LucideIcon } from 'lucide-react';
import type { AuthUser } from '../../../auth/AuthContext';
import type { ThemeName } from '../../../lib/useTheme';
import { BiometricsDashboard } from '../../userData/components/BiometricsDashboard';
import { DataLoadingState } from '../../userData/components/DataLoadingState';
import { DietsDashboard } from '../../userData/components/DietsDashboard';
import { ProfileDashboard } from '../../userData/components/ProfileDashboard';
import { useHealthOverview } from '../../userData/hooks/useHealthOverview';
import type { AgentWorkspace } from '../../chat/types';

interface WorkspacePageProps {
  workspace: Exclude<AgentWorkspace, 'chat'>;
  user?: AuthUser | null;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  theme: ThemeName;
  onToggleTheme: () => void;
}

const labels: Record<Exclude<AgentWorkspace, 'chat'>, { title: string; subtitle: string }> = {
  diets: { title: 'Dietas', subtitle: 'Planes, preferencias y restricciones renderizadas para el usuario.' },
  biometrics: { title: 'Biometrics', subtitle: 'Peso, sueño, energía y adherencia en gráficos simples.' },
  profile: { title: 'Profile', subtitle: 'Contexto persistente para personalización y seguridad.' },
  about: { title: 'About', subtitle: 'Arquitectura de demo y boundary hacia LangGraph.' },
};

const aboutCopy = {
  icon: FileText,
  title: 'About this V1',
  subtitle: 'La demo se centra en chat primero, navegación por aplicaciones del agente y una base visual profesional.',
  blocks: [
    ['Frontend', 'Vite, React, TypeScript, Motion y CSS tokens. Sin gradientes ni estética genérica de IA.'],
    ['Backend', 'FastAPI con auth, cookies HttpOnly, JWT, CSRF, Postgres y endpoints protegidos para datos personales.'],
    ['Data UX', 'Peso, sueño, adherencia, energía y preferencias ya se visualizan como producto, no como JSON técnico.'],
    ['V0.4 Core', 'Conversaciones y mensajes persistidos, perfil demo read-only y AgentGateway mock/real como boundary.'],
  ],
} satisfies {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  blocks: Array<[string, string]>;
};

function WorkspaceHeader({
  workspace,
  sidebarCollapsed,
  onToggleSidebar,
  theme,
  onToggleTheme,
}: Pick<WorkspacePageProps, 'workspace' | 'sidebarCollapsed' | 'onToggleSidebar' | 'theme' | 'onToggleTheme'>) {
  const label = labels[workspace];
  return (
    <header className="workspace-header">
      <div className="header-title">
        <strong>{label.title}</strong>
        <span>{label.subtitle}</span>
      </div>
      <div className="header-actions">
        <button className="icon-button" onClick={onToggleSidebar} type="button" aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}>
          {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
        <button className="mode-button" onClick={onToggleTheme} type="button">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />} {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>
    </header>
  );
}

function AboutWorkspace() {
  const Icon = aboutCopy.icon;
  return (
    <div className="workspace-content-shell">
      <div className="workspace-card about-card">
        <div className="workspace-icon">
          <Icon size={22} strokeWidth={1.8} />
        </div>
        <span className="workspace-eyebrow">Victus agent app</span>
        <h1>{aboutCopy.title}</h1>
        <p>{aboutCopy.subtitle}</p>
        <div className="workspace-blocks">
          {aboutCopy.blocks.map(([label, value]) => (
            <section className="workspace-block" key={label}>
              <strong>{label}</strong>
              <span>{value}</span>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WorkspacePage({ workspace, user, sidebarCollapsed, onToggleSidebar, theme, onToggleTheme }: WorkspacePageProps) {
  const overview = useHealthOverview();

  let content: React.ReactNode;
  if (workspace === 'about') {
    content = <AboutWorkspace />;
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
        {workspace === 'diets' ? <DietsDashboard overview={overview.data} /> : null}
        {workspace === 'biometrics' ? <BiometricsDashboard overview={overview.data} /> : null}
        {workspace === 'profile' ? <ProfileDashboard overview={overview.data} user={user} /> : null}
      </div>
    );
  }

  return (
    <main className="workspace-main data-main">
      <WorkspaceHeader
        workspace={workspace}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={onToggleSidebar}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />
      {content}
    </main>
  );
}
