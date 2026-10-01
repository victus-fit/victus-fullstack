import { AlertTriangle, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface SettingsDashboardProps { onDeleteAccount: () => Promise<void>; }

export function SettingsDashboard({ onDeleteAccount }: SettingsDashboardProps) {
  const [confirmation, setConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function removeAccount() {
    setIsDeleting(true); setError(null);
    try { await onDeleteAccount(); } catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo borrar la cuenta.'); } finally { setIsDeleting(false); }
  }
  return <div className="workspace-content-shell data-content-shell"><section className="workspace-card settings-card"><span className="workspace-eyebrow">Cuenta</span><h1>Ajustes</h1><p>Administra la información y el acceso a tu cuenta de Victus.</p></section><section className="workspace-card danger-zone"><div><span className="workspace-eyebrow">Zona de peligro</span><h2><AlertTriangle size={18} /> Borrar cuenta</h2><p>Eliminará permanentemente tu perfil, biometrías, comidas, planes y conversaciones. Esta acción no se puede deshacer.</p></div><label>Escribe <strong>ELIMINAR</strong> para confirmar<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" /></label>{error ? <p className="meal-error">{error}</p> : null}<button className="danger-button" type="button" disabled={confirmation !== 'ELIMINAR' || isDeleting} onClick={() => void removeAccount()}><Trash2 size={16} />{isDeleting ? 'Borrando cuenta…' : 'Borrar mi cuenta'}</button></section></div>;
}
