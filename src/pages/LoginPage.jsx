import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider.jsx';
import {
  sendPasswordReset, signIn, signUpTrainee, updatePassword,
} from '../services/authService.js';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../local/client.js';
import { Brand, Button, Field, Icon, SelectField } from '../components/ui.jsx';

export function ConfigurationError({ message }) {
  return (
    <main className="login-page">
      <div className="login-grid" aria-hidden="true" />
      <section className="login-card config-card">
        <header><Brand /></header>
        <div className="login-card__body">
          <Icon name="warning" /><h1>Configuration required</h1><p>{message}</p>
          <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Open backend setup</a>
        </div>
      </section>
      <div className="login-block login-block--orange" /><div className="login-block login-block--navy" />
    </main>
  );
}

export function LoginPage() {
  const { client, error: authError, setError: setAuthError } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ displayName: '', email: '', password: '', role: 'trainee' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  function changeMode(nextMode) {
    setMode(nextMode); setMessage(''); setAuthError(null);
  }

  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage(''); setAuthError(null);
    try {
      if (mode === 'forgot') {
        await sendPasswordReset(client, form.email);
        setMessage('Password reset email sent. Please check your inbox.');
      } else if (mode === 'register') {
        const result = await signUpTrainee(client, form);
        setMessage(result.needsEmailConfirmation ? 'Account created. Check your email to confirm your account.' : 'Account created. Signing you in.');
      } else {
        await signIn(client, form);
      }
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function demo(account) {
    setBusy(true); setAuthError(null);
    try { await signIn(client, { email: account.email, password: DEMO_PASSWORD }); }
    catch (error) { setAuthError(error.message); } finally { setBusy(false); }
  }

  return (
    <main className="login-page story-login">
      <div className="login-grid" aria-hidden="true" />
      <section className="founder-story" aria-labelledby="story-title">
        <a className="story-brand" href="#/login"><Brand /></a>
        <span className="eyebrow">BUILT BY A STUDENT. FOR LIFE BEYOND THE COURT.</span>
        <h1 id="story-title">Big goals.<br />Full schedule.<br /><em>Find your balance.</em></h1>
        <p className="story-lead">Classes. Homework. Basketball. When every hour is spoken for, getting better needs a plan that fits real life.</p>
        <div className="story-pillars"><span><Icon name="fitness_center" /> Train with purpose</span><span><Icon name="monitoring" /> Recover with care</span><span><Icon name="restaurant" /> Fuel your day</span></div>
        <article className="michael-story"><div className="founder-monogram">M</div><div><span className="eyebrow">WHY MICHAEL STARTED PRO-FIT</span><p>As a high school basketball player, Michael wanted a better way to balance school, training, and his energy. He started Pro-fit to help himself and other students make room for movement, meals, sleep, and rest—with support from a coach.</p><strong>A student-led project, growing through real feedback.</strong></div></article>
        <p className="story-footnote">Small, sustainable choices. More support. Room to grow.</p>
      </section>
      <section className="login-card">
        <header><Brand /></header>
        <div className="login-card__body">
          <p className="login-purpose">Make a little room for your next step.</p>{client.isLocal ? <p className="local-mode-note">Local preview. Accounts and logs stay in this browser. Use a test password.</p> : null}
          <h1>{mode === 'login' ? 'Welcome to Pro-fit' : mode === 'register' ? 'Create your account' : 'Reset password'}</h1>
          <form onSubmit={submit}>
            {mode === 'register' && client.isLocal ? <SelectField label="Your role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="trainee">Coachee</option><option value="coach">Coach</option></SelectField> : null}
            {mode === 'register' ? <Field label="Full name" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder="YOUR NAME" required /> : null}
            <Field label="Email address" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="ATHLETE@DOMAIN.COM" autoComplete="email" required />
            {mode !== 'forgot' ? <Field label="Password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="••••••••" minLength={8} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required action={mode === 'login' && !client.isLocal ? <button type="button" onClick={() => changeMode('forgot')}>Forgot?</button> : null} /> : null}
            {message ? <p className="form-success"><Icon name="mark_email_read" />{message}</p> : null}
            {authError ? <p className="form-error" role="alert"><Icon name="warning" />{authError}</p> : null}
            <Button type="submit" className="login-submit" icon={mode === 'forgot' ? 'send' : 'arrow_forward'} busy={busy}>
              {mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send reset link'}
            </Button>
          </form>
          {mode === 'login' ? <div className="demo-accounts"><span>Quick demo login</span><div>{DEMO_ACCOUNTS.map((account) => <Button key={account.id} variant="outline" busy={busy} onClick={() => demo(account)}>{account.display_name} · {account.role === 'coach' ? 'Coach' : 'Coachee'}</Button>)}</div><small>{client.isLocal ? 'Fictional activity illustrates the experience. New accounts start fresh.' : 'Demo accounts with sample data for exploring Pro-fit.'}</small></div> : null}
          <div className="login-switch">
            {mode === 'login' ? <>New here? <button onClick={() => changeMode('register')}>Create an account</button></> : <>Already have an account? <button onClick={() => changeMode('login')}>Back to sign in</button></>}
          </div>
        </div>
      </section>
      <footer className="login-footer">PRO-FIT · Student-led, coach-supported. Training, recovery, and everyday balance.</footer>
    </main>
  );
}

export function UpdatePasswordPage({ onDone }) {
  const { client, setRecoveryMode } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault(); setError('');
    if (password !== confirm) { setError('Your passwords do not match.'); return; }
    setBusy(true);
    try {
      await updatePassword(client, password);
      setMessage('Password updated. You can continue using Pro-fit.');
      setRecoveryMode(false);
    } catch (nextError) { setError(nextError.message); } finally { setBusy(false); }
  }

  return (
    <main className="login-page"><section className="login-card"><header><Brand /></header><div className="login-card__body">
      <h1>Set a new password</h1>
      <form onSubmit={submit}><Field label="New Password" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /><Field label="Confirm Password" type="password" minLength={8} value={confirm} onChange={(event) => setConfirm(event.target.value)} required />
        {error ? <p className="form-error" role="alert">{error}</p> : null}{message ? <p className="form-success">{message}</p> : null}
        {message ? <Button type="button" onClick={onDone}>Continue</Button> : <Button type="submit" busy={busy}>Update Password</Button>}
      </form>
    </div></section></main>
  );
}

