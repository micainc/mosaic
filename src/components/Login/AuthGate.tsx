import React, { useEffect, useState } from 'react';
import { API_URL, getCurrentUser, login, User } from '../../auth';
import './Login.css';

const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!API_URL);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!API_URL) return;
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (!API_URL && !import.meta.env.DEV) {
    return <div className="login"><p className="login-error">Auth is not configured.</p></div>;
  }

  if (user) return <>{children}</>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      setUser(await login(email, password));
    } catch (err: any) {
      setError(err instanceof TypeError ? 'Could not reach the server.' : err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login">
      <form className="login-box" onSubmit={handleSubmit}>
        <h1>MOSAIC</h1>
        {loading ? <p>Loading...</p> : (
          <>
            <input
              className="login-input"
              type="email"
              placeholder="Email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
            <input
              className="login-input"
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button className="login-button" type="submit" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
            <p>Access is invite-only.</p>
            {import.meta.env.DEV && (
              <button
                className="login-dev-button"
                type="button"
                onClick={() => setUser({ id: 'dev', email: 'dev@localhost', organizationId: 'dev', role: 'admin' })}
              >
                Dev: skip login
              </button>
            )}
          </>
        )}
        {error && <p className="login-error">{error}</p>}
      </form>
    </div>
  );
};

export default AuthGate;
