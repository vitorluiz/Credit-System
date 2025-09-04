import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

/**
 * Welcome component. After logging in the user is taken here. It
 * retrieves the user's data from the API using the token stored in
 * localStorage. If no valid token is found the user is redirected to
 * the login page. Includes a logout button to clear the session.
 */
export default function Welcome() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchUser() {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      try {
        const res = await axios.get('/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(res.data);
      } catch (err) {
        setError('Não autorizado. Faça login novamente.');
        localStorage.removeItem('token');
        localStorage.removeItem('name');
        setTimeout(() => navigate('/login'), 1500);
      }
    }
    fetchUser();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('name');
    navigate('/login');
  };

  return (
    <div className="container">
      {user ? (
        <>
          <h1>Bem vindo, {user.name}!</h1>
          <p>Email: {user.email}</p>
          {user.phone && <p>Telefone: {user.phone}</p>}
          <button onClick={handleLogout}>Sair</button>
        </>
      ) : (
        <h1>{error || 'Carregando...'}</h1>
      )}
    </div>
  );
}
