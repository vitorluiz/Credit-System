import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';

/**
 * Password recovery component. Lets a user request a password reset by
 * submitting their email and a new password. The backend always
 * responds with a generic message to avoid revealing whether the
 * account exists.
 */
export default function ResetPassword() {
  const location = useLocation();
  const urlEmail = useMemo(() => new URLSearchParams(location.search).get('email') || '', [location.search]);
  const [email, setEmail] = useState(urlEmail);
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await axios.post('/api/reset-password', { email, newPassword });
      setMessage('Se o email existir, a senha foi redefinida.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError('Erro ao redefinir a senha.');
    }
  };

  return (
    <div className="container">
      <h1>Recuperar senha</h1>
      <form onSubmit={handleSubmit}>
        {!urlEmail && (
          <>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </>
        )}
        <label htmlFor="newPassword">Nova senha</label>
        <input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          required
        />
        <button type="submit">Redefinir senha</button>
        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}
        <div className="link">
          <Link to="/login">Voltar ao login</Link>
        </div>
      </form>
    </div>
  );
}
