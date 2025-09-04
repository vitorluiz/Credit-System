import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

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

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('/api/login', { email, password });
      // Save the token, user name and admin flag in local storage
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('name', res.data.name);
      localStorage.setItem('isAdmin', res.data.isAdmin);
      // First access flow: ask for CPF and phone if missing
      if (res.data.needsFirstAccess) {
        navigate('/first-access');
        return;
      }
      // Redirect to dashboard or admin dashboard depending on role
      if (res.data.isAdmin) {
        navigate('/admin-dashboard');
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
    <div className="container">
      <h1>Entrar</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <label htmlFor="password">Senha</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
        {error && <div className="error">{error}</div>}
        <div className="link">
          Não possui conta? <Link to="/register">Criar conta</Link>
        </div>
        <div className="link">
          <Link to="/reset-password">Esqueci minha senha</Link>
        </div>
      </form>
    </div>
  );
}
