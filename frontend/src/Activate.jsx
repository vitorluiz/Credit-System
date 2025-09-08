import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Activate.css';

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
    <div className="activate">
      <div className="activate__container">
        <div className="activate__logo">
          <img src="/img/LogoFloraisMin.svg" alt="Logo Florais" />
        </div>
        
        <h1 className="activate__title">
          {mode === 'reset' ? 'Redefinir Senha' : 'Ativar Conta'}
        </h1>
        
        {message && (
          <div className="activate__message activate__message--success">
            {message}
          </div>
        )}
        
        {error && (
          <div className="activate__message activate__message--error">
            {error}
          </div>
        )}
        
        <form className="activate__form" onSubmit={handleSubmit}>
          <div className="activate__form-group">
            <label htmlFor="newPassword" className="activate__label">
              Senha
            </label>
            <input 
              id="newPassword" 
              type="password" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              className="activate__input"
              placeholder="Digite sua nova senha"
              required 
            />
          </div>
          
          <div className="activate__form-group">
            <label htmlFor="confirmPassword" className="activate__label">
              Confirmar Senha
            </label>
            <input 
              id="confirmPassword" 
              type="password" 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              className="activate__input"
              placeholder="Confirme sua nova senha"
              required 
            />
          </div>
          
          <button type="submit" className="activate__button">
            {mode === 'reset' ? 'Redefinir Senha' : 'Ativar Conta'}
          </button>
        </form>
        
        <div className="activate__link">
          <Link to="/login">Voltar ao login</Link>
        </div>
      </div>
    </div>
  );
}


