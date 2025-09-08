import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

/**
 * Login component. Authenticates an existing user by sending their
 * email and password to the API. On success the returned JWT is
 * stored in localStorage and the user is redirected to the welcome
 * page. A link to password recovery is provided.
 */
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Verificar se já está logado
  useEffect(() => {
    const token = localStorage.getItem('token');
    const sessionToken = localStorage.getItem('sessionToken');
    
    if (token && sessionToken) {
      // Verificar se a sessão ainda é válida
      axios.get('/api/me', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(() => {
        // Sessão válida, redirecionar para dashboard
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        if (isAdmin) {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }).catch(() => {
        // Sessão inválida, limpar localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('name');
        localStorage.removeItem('isAdmin');
      });
    }
  }, [navigate]);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('/api/login', { email, password });
      // Save the token, user name, admin flag and session token in local storage
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('name', res.data.name);
      localStorage.setItem('isAdmin', res.data.isAdmin);
      localStorage.setItem('sessionToken', res.data.sessionToken);
      // First access flow: ask for CPF and phone if missing
      if (res.data.needsFirstAccess) {
        navigate('/first-access');
        return;
      }
      // Redirect to dashboard or admin dashboard depending on role
      if (res.data.isAdmin) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Falha ao autenticar.');
      }
    }
  };

  return (
    <div className="login">
      <div className="login__container">
        {/* Header */}
        <div className="login__header">
          <div className="login__logo">
            <img src="/img/LogoFloraisMin.svg" alt="Logo Florais" />
          </div>
          <h1 className="login__title">Entrar</h1>
          <p className="login__subtitle">Digite suas credenciais para acessar</p>
        </div>

        {/* Form */}
        <form className="login__form" onSubmit={handleSubmit}>
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
            <label htmlFor="password" className="form-label">Senha</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              required
            />
          </div>

          <button type="submit" className="btn btn--primary btn--full">
            Entrar
          </button>

          {/* Error Message */}
          {error && (
            <div className="alert alert--error">
              <div className="alert__icon">❌</div>
              <div className="alert__content">{error}</div>
            </div>
          )}

          {/* Footer */}
          <div className="login__footer">
            <div className="login__links">
              <p className="login__register-text">
                Não possui conta? 
                <Link to="/register" className="login__register-link">Criar conta</Link>
              </p>
              <p className="login__forgot-text">
                <Link to="/reset-password" className="login__forgot-link">Esqueci minha senha</Link>
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
