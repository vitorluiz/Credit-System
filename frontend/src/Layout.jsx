import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './layout.css';

/**
 * Layout component providing a sidebar navigation and a content area.
 * It reads the current user's name and admin status from
 * localStorage to conditionally render admin links. A logout button
 * clears the session and returns the user to the login page.
 */
export default function Layout({ children }) {
  const navigate = useNavigate();
  const name = localStorage.getItem('name') || '';
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('name');
    localStorage.removeItem('isAdmin');
    navigate('/login');
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="logo">
          <span role="img" aria-label="logo">📄</span> Gestão de Crédito Super. Florais
        </div>
        <nav className="nav-links">
          <Link to="/dashboard">Minhas Solicitações</Link>
          <Link to="/new-request">Enviar Crédito</Link>
          {isAdmin && <Link to="/admin-dashboard">Painel do Admin</Link>}
          {isAdmin && <Link to="/requests">Todas Solicitações</Link>}
        </nav>
        <div className="user-info">
          <div>{name}</div>
          <div className="role">{isAdmin ? 'Administrador' : 'Usuário'}</div>
          <button className="logout" onClick={handleLogout}>Sair</button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
