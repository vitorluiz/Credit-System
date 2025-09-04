import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function Activate() {
  const location = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Ativando sua conta...');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (!token) {
      setError('Token não informado.');
      setMessage('');
      return;
    }
    async function activate() {
      try {
        const res = await axios.post('/api/activate', { token });
        setEmail(res.data.email || '');
        setMessage('Conta ativada! Agora defina sua senha.');
      } catch (err) {
        setError('Falha ao ativar a conta. Token inválido ou expirado.');
        setMessage('');
      }
    }
    activate();
  }, [location.search]);

  function goToSetPassword() {
    if (email) {
      navigate(`/reset-password?email=${encodeURIComponent(email)}`);
    } else {
      navigate('/reset-password');
    }
  }

  return (
    <div className="container">
      <h1>Ativação de Conta</h1>
      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}
      {!error && (
        <button onClick={goToSetPassword} style={{ marginTop: '1rem' }}>Definir Senha</button>
      )}
      <div className="link" style={{ marginTop: '1rem' }}>
        <Link to="/login">Voltar ao login</Link>
      </div>
    </div>
  );
}


