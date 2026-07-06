import { useState } from 'react';
import { ArrowLeft, Compass, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { CompassMark } from '../components/CompassMark';
import { apiUrl } from '../lib/api';
import { navigate } from '../lib/navigation';
import type { ThemeName } from '../lib/useTheme';

interface AuthPageProps {
  mode: 'login' | 'register';
  theme: ThemeName;
  onToggleTheme: () => void;
}

export function AuthPage({ mode, theme, onToggleTheme }: AuthPageProps) {
  const auth = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('carlos.demo@victus.health');
  const [password, setPassword] = useState('victus-demo-2026');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegister = mode === 'register';

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setLocalError(null);
    try {
      if (isRegister) {
        await auth.register({ email, password, display_name: displayName || 'Victus User' });
      } else {
        await auth.login({ email, password });
      }
      navigate('/app');
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : 'No se pudo completar la autenticación');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function enterDemo() {
    setIsSubmitting(true);
    setLocalError(null);
    try {
      await auth.loginDemo();
      navigate('/app');
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : 'No se pudo abrir el perfil demo');
    } finally {
      setIsSubmitting(false);
    }
  }

  function startGoogle() {
    window.location.href = apiUrl('/api/auth/google/start');
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand">
          <CompassMark />
          <div>
            <strong>Victus</strong>
            <span>Scientific health intelligence</span>
          </div>
        </div>

        <button className="ghost-link" type="button" onClick={() => navigate('/')}>
          <ArrowLeft size={15} /> Volver a la demo
        </button>

        <div className="auth-copy">
          <span className="workspace-eyebrow">{isRegister ? 'Crear cuenta' : 'Iniciar sesión'}</span>
          <h1>{isRegister ? 'Abre el workspace completo.' : 'Vuelve al workspace protegido.'}</h1>
          <p>
            Puedes registrar una cuenta real, entrar con el perfil demo bloqueado o iniciar el flujo de Google OAuth.
            La sesión se guarda con cookies HttpOnly y CSRF desde FastAPI.
          </p>
        </div>

        <div className="auth-provider-grid">
          <button className="provider-button" type="button" onClick={enterDemo} disabled={isSubmitting}>
            Entrar como demo
          </button>
          <button className="provider-button" type="button" onClick={startGoogle}>
            Continuar con Google
          </button>
        </div>

        <div className="auth-divider"><span>o usar email</span></div>

        <form className="auth-form" onSubmit={onSubmit}>
          {isRegister ? (
            <label>
              Nombre
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Carlos" />
            </label>
          ) : null}
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>
          <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              minLength={10}
              required
            />
          </label>

          {localError || auth.error ? <div className="auth-error">{localError ?? auth.error}</div> : null}

          <button className="auth-submit" disabled={isSubmitting} type="submit">
            {isRegister ? <UserPlus size={16} /> : <LogIn size={16} />}
            {isSubmitting ? 'Procesando…' : isRegister ? 'Registrarse' : 'Entrar'}
          </button>
        </form>

        <div className="auth-switch">
          {isRegister ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'}{' '}
          <button type="button" onClick={() => navigate(isRegister ? '/login' : '/register')}>
            {isRegister ? 'Iniciar sesión' : 'Registrarse'}
          </button>
        </div>
      </section>

      <aside className="auth-aside">
        <Compass size={34} />
        <h2>Producto demo, arquitectura real.</h2>
        <p>
          El perfil demo usa datos ficticios típicos de un hombre adulto de peso estándar. Es solo lectura para mostrar
          capacidades sin mezclarlo con datos personales reales.
        </p>
        <button className="mode-button" type="button" onClick={onToggleTheme}>
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
      </aside>
    </main>
  );
}
