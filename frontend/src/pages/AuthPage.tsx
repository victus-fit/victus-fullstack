import { useState } from 'react';
import { ArrowLeft, CheckCircle2, KeyRound, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { CompassMark } from '../components/CompassMark';
import { AUTH_BASE_URL, authClient } from '../lib/authClient';
import { navigate } from '../lib/navigation';

interface AuthPageProps {
  mode: 'login' | 'register';
}

export function AuthPage({ mode }: AuthPageProps) {
  const auth = useAuth();
  const [localMode, setLocalMode] = useState<'login' | 'register'>(mode);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('usuario@victus.health');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const returnTo = new URLSearchParams(window.location.search).get('return_to');
  const isRegister = localMode === 'register';

  function finishAuth() {
    if (returnTo?.startsWith(window.location.origin) || returnTo?.startsWith('http://localhost:8000')) {
      window.location.href = returnTo;
      return;
    }
    navigate('/app');
  }

  function betterAuthCallbackUrl() {
    const target = returnTo || `${window.location.origin}/app`;
    const params = new URLSearchParams({ return_to: target });
    return `${AUTH_BASE_URL}/api/victus/session/complete?${params.toString()}`;
  }

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
      finishAuth();
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
      finishAuth();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : 'No se pudo abrir el perfil de prueba');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function startGoogle() {
    setIsSubmitting(true);
    setLocalError(null);
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: betterAuthCallbackUrl(),
      });
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : 'No se pudo iniciar sesión con Google');
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell" id="main-content">
      <section className="auth-card">
        <div className="auth-brand">
          <CompassMark />
          <div>
            <strong>Victus</strong>
            <span>Cuenta privada</span>
          </div>
        </div>

        <button className="ghost-link" type="button" onClick={() => navigate('/')}>
          <ArrowLeft size={15} /> Volver
        </button>

        <div className="auth-copy">
          <span className="workspace-eyebrow">{returnTo ? 'Autorización segura' : 'Acceso'}</span>
          <h1>
            {returnTo ? 'Conecta tu sesión' : 'Entra o crea tu cuenta'}
          </h1>
          <p>
            Usa Google para continuar. Si es tu primera vez, Victus creará tu cuenta y dejará lista la sesión privada.
          </p>
        </div>

        <button className="google-auth-button" type="button" onClick={startGoogle} disabled={isSubmitting}>
          <span className="google-auth-mark" aria-hidden="true">G</span>
          <span>{isSubmitting ? 'Abriendo Google…' : 'Continuar con Google'}</span>
        </button>

        <div className="auth-trust-row">
          <span><CheckCircle2 size={14} /> Cookies HttpOnly</span>
          <span><CheckCircle2 size={14} /> Perfil privado</span>
          {returnTo ? <span><CheckCircle2 size={14} /> Vuelve al CLI</span> : null}
        </div>

        {localError || auth.error ? <div className="auth-error">{localError ?? auth.error}</div> : null}

        <details className="auth-dev-panel">
          <summary><KeyRound size={15} /> Opciones de desarrollo</summary>

          <div className="auth-provider-grid">
            <button className="provider-button" type="button" onClick={enterDemo} disabled={isSubmitting}>
              Perfil de prueba
            </button>
            <div className="auth-mode-row" role="group" aria-label="Modo de cuenta local">
              <button
                className={localMode === 'login' ? 'is-active' : ''}
                type="button"
                onClick={() => setLocalMode('login')}
              >
                Entrar
              </button>
              <button
                className={localMode === 'register' ? 'is-active' : ''}
                type="button"
                onClick={() => setLocalMode('register')}
              >
                Crear
              </button>
            </div>
          </div>

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

            <button className="auth-submit" disabled={isSubmitting} type="submit">
              {isRegister ? <UserPlus size={16} /> : <LogIn size={16} />}
              {isSubmitting ? 'Procesando…' : isRegister ? 'Crear cuenta local' : 'Entrar con email'}
            </button>
          </form>
        </details>
      </section>
    </main>
  );
}
