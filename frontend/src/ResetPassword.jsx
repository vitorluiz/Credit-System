import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './ResetPassword.css';

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
    <div className="reset-password">
      <div className="reset-password__container">
        <div className="reset-password__header">
          <div className="reset-password__logo">
            <img src="/img/LogoFloraisMin.svg" alt="Logo Florais" />
          </div>
          <h1 className="reset-password__title">Esqueci minha senha</h1>
          <p className="reset-password__subtitle">
            Digite seu email para receber instruções de redefinição
          </p>
        </div>

        <form className="reset-password__form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="email" className="form-field__label">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="form-field__input"
              placeholder="Digite seu email"
              required
            />
          </div>

          <button type="submit" className="btn btn--primary btn--full">
            Enviar instruções
          </button>

          {message && (
            <div className="alert alert--success">
              <span className="alert__icon">✓</span>
              <div className="alert__content">{message}</div>
            </div>
          )}

          {error && (
            <div className="alert alert--error">
              <span className="alert__icon">⚠</span>
              <div className="alert__content">{error}</div>
            </div>
          )}
        </form>

        <div className="reset-password__footer">
          <div className="reset-password__links">
            <p className="reset-password__back-text">
              Lembrou da senha?{' '}
              <Link to="/login" className="reset-password__back-link">
                Voltar ao login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
