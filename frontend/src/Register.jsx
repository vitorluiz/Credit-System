import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Register.css';

/**
 * Registration form component. Allows a new user to create an account by
 * providing their name, email, password and phone number. On success
 * users are redirected to the login page.
 */
export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [activationLink, setActivationLink] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const res = await axios.post('/api/register', { name, email, phone: `+55${onlyDigits(phone)}` });
      setActivationLink(res.data.activationLink || '');
      setMessage('Registro realizado! Enviamos um link de ativação para o seu email.');
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Erro ao registrar.');
      }
    }
  };

  function onlyDigits(value) {
    return (value || '').replace(/\D/g, '');
  }

  function formatPhone(value) {
    const v = onlyDigits(value).slice(0, 11);
    if (v.length <= 2) return `(${v}`;
    if (v.length <= 6) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
    if (v.length <= 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
    return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  }

  return (
    <div className="register">
      <div className="register__container">
        {/* Header */}
        <div className="register__header">
          <div className="register__logo">
            <img src="/img/LogoFloraisMin.svg" alt="Logo Florais" />
          </div>
          <h1 className="register__title">Criar conta</h1>
          <p className="register__subtitle">Preencha os dados para criar sua conta</p>
        </div>

        {/* Form */}
        <form className="register__form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name" className="form-label">Nome completo</label>
            <input
              id="name"
              type="text"
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Digite seu nome completo"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone" className="form-label">Telefone (WhatsApp)</label>
            <div className="phone-input">
              <span className="phone-input__prefix">+55</span>
              <input
                id="phone"
                type="tel"
                className="form-input phone-input__field"
                value={phone}
                onChange={e => setPhone(formatPhone(e.target.value))}
                placeholder="(XX) XXXXX-XXXX"
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn--primary btn--full">
            Criar conta
          </button>

          {/* Messages */}
          {message && (
            <div className="alert alert--success">
              <div className="alert__icon">✅</div>
              <div className="alert__content">{message}</div>
            </div>
          )}

          {error && (
            <div className="alert alert--error">
              <div className="alert__icon">❌</div>
              <div className="alert__content">{error}</div>
            </div>
          )}

          {activationLink && (
            <div className="alert alert--info">
              <div className="alert__icon">ℹ️</div>
              <div className="alert__content">
                <strong>Link de ativação (teste):</strong>
                <a href={activationLink} className="alert__link">Ativar conta</a>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="register__footer">
            <p className="register__login-text">
              Já possui conta? 
              <Link to="/login" className="register__login-link">Entrar</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
