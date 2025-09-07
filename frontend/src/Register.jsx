import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

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
    <div className="container">
      <div className="logo-container" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <img src="/LogoFlorais.png" alt="Logo Florais" style={{ maxWidth: '200px', height: 'auto' }} />
      </div>
      <h1>Criar conta</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="name">Nome</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <label htmlFor="phone">Telefone (WhatsApp)</label>
        <div className="phone-input-container">
          <span className="phone-prefix">+55</span>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={e => setPhone(formatPhone(e.target.value))}
            placeholder="(XX) XXXXX-XXXX"
            required
          />
        </div>
        <button type="submit">Registrar</button>
        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}
        {activationLink && (
          <div className="info" style={{ marginTop: '0.75rem' }}>
            Link de ativação (teste): <a href={activationLink}>Ativar conta</a>
          </div>
        )}
        <div className="link">
          Já possui conta? <Link to="/login">Entrar</Link>
        </div>
      </form>
    </div>
  );
}
