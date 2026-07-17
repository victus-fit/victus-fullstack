import { ShieldCheck, UserRound } from 'lucide-react';
import type { AuthUser } from '../../../auth/AuthContext';
import type { HealthOverview } from '../types';
import { PreferenceTable } from './PreferenceTable';

interface ProfileDashboardProps {
  overview: HealthOverview;
  user: AuthUser | null | undefined;
}

export function ProfileDashboard({ overview, user }: ProfileDashboardProps) {
  return (
    <div className="data-workspace-layout split-data-layout">
      <section className="workspace-hero-card data-hero-card profile-identity-card">
        <div className="workspace-icon"><UserRound size={22} strokeWidth={1.8} /></div>
        <span className="workspace-eyebrow">Victus user context</span>
        <h1>{overview.profile_label ?? user?.display_name ?? 'Profile'}</h1>
        <p>{overview.profile_note ?? user?.primary_email ?? 'Datos persistentes del usuario para personalizar dieta, biometría, restricciones y comunicación.'}</p>
        {overview.read_only ? (
          <div className="read-only-banner">
            <ShieldCheck size={17} />
            <div>
              <strong>Perfil de prueba bloqueado</strong>
              <span>Estos datos son ficticios y no se pueden actualizar. Sirven para probar Dietas, Biometrics y Profile.</span>
            </div>
          </div>
        ) : null}
        <div className="profile-meta-grid">
          <div><span>Locale</span><strong>{user?.locale ?? 'es-CL'}</strong></div>
          <div><span>Timezone</span><strong>{user?.timezone ?? 'America/Santiago'}</strong></div>
          <div><span>Status</span><strong>{user?.status ?? 'active'}</strong></div>
        </div>
      </section>
      <PreferenceTable groups={overview.preference_groups} />
    </div>
  );
}
