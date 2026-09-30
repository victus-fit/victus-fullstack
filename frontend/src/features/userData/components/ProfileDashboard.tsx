import { UserRound } from 'lucide-react';
import type { AuthUser } from '../../../auth/AuthContext';
import type { HealthOverview } from '../types';
import { PreferenceTable } from './PreferenceTable';
import { useLanguage } from '../../../i18n/LanguageContext';

interface ProfileDashboardProps {
  overview: HealthOverview;
  user: AuthUser | null | undefined;
}

export function ProfileDashboard({ overview, user }: ProfileDashboardProps) {
  const { language, t } = useLanguage();
  return (
    <div className="data-workspace-layout split-data-layout">
      <section className="workspace-hero-card data-hero-card profile-identity-card">
        <div className="workspace-icon"><UserRound size={22} strokeWidth={1.8} /></div>
        <span className="workspace-eyebrow">Victus user context</span>
        <h1>{user?.display_name ?? 'Profile'}</h1>
        <p>{user?.primary_email ?? 'Persistent user data used to personalise nutrition, biometrics, restrictions and communication.'}</p>
        <div className="profile-meta-grid">
          <div><span>Locale</span><strong>{user?.locale ?? 'es-CL'}</strong></div>
          <div><span>Timezone</span><strong>{user?.timezone ?? 'America/Santiago'}</strong></div>
          <div><span>Status</span><strong>{user?.status ?? 'active'}</strong></div>
        </div>
        <div><span>{t('searchLanguage')}</span><strong>{language === 'en' ? 'English' : 'Español'}</strong></div>
      </section>
      <PreferenceTable groups={overview.preference_groups} />
    </div>
  );
}
