import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function Activate() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const token = params.get('token') || '';
  const mode = (params.get('mode') || 'register').toLowerCase(); // register | reset
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Token não informado.');
    }
  }, [token]);

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!token) {
      setError('Token inválido.');
      return;
    }
    if (!newPassword || newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    try {
      const res = await axios.post('/api/activate-with-password', { token, newPassword });
      // Se veio de reset, manter sessão e ir ao welcome
      if (mode === 'reset') {
        if (res.data && res.data.token) {
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('name', res.data.name || '');
          localStorage.setItem('isAdmin', String(res.data.isAdmin === true));
        }
        navigate('/dashboard');
      } else {
        // registro: direciona para login
        setMessage('Senha definida! Redirecionando para o login...');
        setTimeout(() => navigate('/login'), 1200);
      }
    } catch (err) {
      setError('Falha ao ativar/definir a senha. Token inválido ou expirado.');
    }
  };

  return (
    <div className="container">
      <div className="logo-container" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <img src="/img/LogoFloraisMin.svg" alt="Logo Florais" style={{ maxWidth: '200px', height: 'auto' }} />
      </div>
      <h1>{mode === 'reset' ? 'Redefinir Senha' : 'Ativar Conta'}</h1>
      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit} style={{ maxWidth: '420px' }}>
        <label htmlFor="newPassword">Senha</label>
        <input id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
        <label htmlFor="confirmPassword">Confirmar Senha</label>
        <input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
        <button type="submit">Salvar</button>
      </form>
      <div className="link" style={{ marginTop: '1rem' }}>
        <Link to="/login">Voltar ao login</Link>
      </div>
    </div>
  );
}


