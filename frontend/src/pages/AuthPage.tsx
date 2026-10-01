import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { CompassMark } from '../components/CompassMark';
import { AUTH_BASE_URL, authClient } from '../lib/authClient';
import { navigate } from '../lib/navigation';

interface AuthPageProps {
  mode: 'login' | 'register';
}

type PendingAction = 'email' | 'google' | null;

export function AuthPage({ mode }: AuthPageProps) {
  const auth = useAuth();
  const [showEmailForm, setShowEmailForm] = useState(mode === 'register');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const returnTo = new URLSearchParams(window.location.search).get('return_to');
  const isRegister = mode === 'register';
  const isSubmitting = pendingAction !== null;

  useEffect(() => {
    setShowEmailForm(mode === 'register');
    setLocalError(null);
  }, [mode]);

  function finishAuth() {
    if (returnTo?.startsWith(window.location.origin) || returnTo?.startsWith('http://localhost:8000')) {
      window.location.href = returnTo;
      return;
    }
    navigate(isRegister ? '/onboarding' : '/app');
  }

  function betterAuthCallbackUrl() {
    const target = returnTo || `${window.location.origin}/app`;
    const params = new URLSearchParams({ return_to: target });
    return `${AUTH_BASE_URL}/api/victus/session/complete?${params.toString()}`;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction('email');
    setLocalError(null);
    try {
      if (isRegister) {
        await auth.register({ email, password, display_name: displayName });
      } else {
        await auth.login({ email, password });
      }
      finishAuth();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : 'Authentication could not be completed');
    } finally {
      setPendingAction(null);
    }
  }

  async function startGoogle() {
    setPendingAction('google');
    setLocalError(null);
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: betterAuthCallbackUrl(),
      });
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : 'Google sign-in could not be started');
      setPendingAction(null);
    }
  }

  function changeMode(nextMode: 'login' | 'register') {
    setDisplayName('');
    setPassword('');
    setLocalError(null);
    setShowEmailForm(nextMode === 'register');
    const query = window.location.search;
    navigate(`/${nextMode}${query}`);
  }

  return (
    <main className="auth-shell" id="main-content">
      <section className="auth-card" aria-labelledby="auth-title">
        <button className="auth-back" type="button" onClick={() => navigate('/')} aria-label="Back to home">
          <ArrowLeft size={16} />
        </button>

        <div className="auth-brand">
          <CompassMark />
          <span>Victus</span>
        </div>

        <div className="auth-copy">
          {returnTo ? <span className="auth-context">Secure authorization</span> : null}
          <h1 id="auth-title">
            {returnTo ? 'Connect your account' : isRegister ? 'Create your account' : 'Sign in to Victus'}
          </h1>
          <p>
            {returnTo
              ? 'Sign in to continue with the requested authorization.'
              : isRegister
                ? 'Save your preferences and tailor your nutrition plan.'
                : 'Continue with your account to see your plan and progress.'}
          </p>
        </div>

        {localError || auth.error ? <div className="auth-error" role="alert">{localError ?? auth.error}</div> : null}

        {showEmailForm ? (
          <form className="auth-form" onSubmit={onSubmit}>
            {isRegister ? (
              <label>
                Name
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  autoComplete="name"
                  placeholder="Your name"
                  required
                />
              </label>
            ) : null}
            <label>
              Email
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                required
              />
            </label>
            <label>
              Password
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                minLength={10}
                placeholder="At least 10 characters"
                required
              />
            </label>

            <button className="auth-submit" disabled={isSubmitting} type="submit">
              <span>{pendingAction === 'email' ? 'Processing…' : isRegister ? 'Create account' : 'Sign in'}</span>
              {pendingAction !== 'email' ? <ArrowRight size={16} /> : null}
            </button>
          </form>
        ) : (
          <button className="email-auth-button" type="button" onClick={() => setShowEmailForm(true)} disabled={isSubmitting}>
            <Mail size={17} />
            <span>Continue with email</span>
          </button>
        )}

        <div className="auth-divider"><span>o</span></div>

        <button className="google-auth-button" type="button" onClick={startGoogle} disabled={isSubmitting}>
          <span className="google-auth-mark" aria-hidden="true">G</span>
          <span>{pendingAction === 'google' ? 'Opening Google…' : 'Continue with Google'}</span>
        </button>

        {showEmailForm && !isRegister ? (
          <button className="auth-method-link" type="button" onClick={() => setShowEmailForm(false)} disabled={isSubmitting}>
            Choose another method
          </button>
        ) : null}

        <p className="auth-switch">
          {isRegister ? 'Already have an account?' : 'New to Victus?'}{' '}
          <button type="button" onClick={() => changeMode(isRegister ? 'login' : 'register')} disabled={isSubmitting}>
            {isRegister ? 'Sign in' : 'Create account'}
          </button>
        </p>
      </section>
    </main>
  );
}
