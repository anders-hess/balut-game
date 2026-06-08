import { useState } from 'react';
import './AuthScreen.css';

function Logo({ size = 36, onClick }) {
  return (
    <div className="auth-logo" style={{ cursor: onClick ? 'pointer' : undefined }} onClick={onClick}>
      <div className="auth-logo__mark" style={{ width: size, height: size, fontSize: size * 0.62 }}>b</div>
      <span className="auth-logo__word" style={{ fontSize: size * 0.62 }}>balut</span>
    </div>
  );
}

// Login / sign-up. On success, onAuthed() lets the parent route away.
export default function AuthScreen({ onClose, onAuthed, signIn, signUp }) {
  const [mode,     setMode]     = useState('login'); // 'login' | 'signup'
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState(null);
  const [notice,   setNotice]   = useState(null);

  const isSignup = mode === 'signup';
  const canSubmit =
    email.trim() && password &&
    (!isSignup || username.trim().length >= 2);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      if (isSignup) {
        const res = await signUp({ email, password, username });
        // If email confirmation is enabled, there's no session yet.
        if (!res?.session) {
          setNotice('Account created. Check your email to confirm, then log in.');
          setMode('login');
          setBusy(false);
          return;
        }
      } else {
        await signIn({ email, password });
      }
      onAuthed?.();
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <header className="auth-screen__header">
        <Logo size={36} onClick={onClose} />
        <button className="auth-screen__back" onClick={onClose}>← Back</button>
      </header>

      <main className="auth-screen__main">
        <div className="auth-screen__hero">
          <div className="auth-screen__kicker">{isSignup ? 'Create account' : 'Welcome back'}</div>
          <h1 className="auth-screen__headline">
            {isSignup ? <>Track every<br />game you play.</> : <>Log in to<br />your profile.</>}
          </h1>
          <p className="auth-screen__desc">
            {isSignup
              ? 'Your password is never visible to anyone — it’s stored only as a secure hash.'
              : 'Pick up your stats and play history right where you left off.'}
          </p>
        </div>

        <form className="auth-screen__card" onSubmit={handleSubmit}>
          {isSignup && (
            <label className="auth-field">
              <span className="auth-field__label">Username</span>
              <input
                className="auth-field__input"
                type="text"
                maxLength={20}
                placeholder="Shown on the leaderboard"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </label>
          )}

          <label className="auth-field">
            <span className="auth-field__label">Email</span>
            <input
              className="auth-field__input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus={!isSignup}
            />
          </label>

          <label className="auth-field">
            <span className="auth-field__label">Password</span>
            <input
              className="auth-field__input"
              type="password"
              placeholder={isSignup ? 'At least 6 characters' : 'Your password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              minLength={6}
            />
          </label>

          {error  && <p className="auth-screen__error">{error}</p>}
          {notice && <p className="auth-screen__notice">{notice}</p>}

          <button className="auth-btn-primary" type="submit" disabled={!canSubmit || busy}>
            {busy ? 'Please wait…' : isSignup ? 'Create account →' : 'Log in →'}
          </button>

          <button
            type="button"
            className="auth-btn-toggle"
            onClick={() => { setMode(isSignup ? 'login' : 'signup'); setError(null); setNotice(null); }}
          >
            {isSignup ? 'Already have an account? Log in' : 'New here? Create an account'}
          </button>
        </form>
      </main>
    </div>
  );
}
