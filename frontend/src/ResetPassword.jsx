import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

/**
 * Password recovery component. Lets a user request a password reset by
 * submitting their email and a new password. The backend always
 * responds with a generic message to avoid revealing whether the
 * account exists.
 */
export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await axios.post('/api/forgot-password', { email });
      setMessage('Se o email existir, enviaremos instruções de redefinição.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError('Erro ao enviar instruções.');
    }
  };

  return (
    <div className="container">
      <div className="logo-container" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <img src="/img/LogoFloraisMin.svg" alt="Logo Florais" style={{ maxWidth: '200px', height: 'auto' }} />
      </div>
      <h1>Esqueci minha senha</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <button type="submit">Enviar instruções</button>
        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}
        <div className="link">
          <Link to="/login">Voltar ao login</Link>
        </div>
      </form>
    </div>
  );
}
