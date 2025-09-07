import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Modal from './components/Modal';
import { usePatients } from './context/PatientContext.jsx'; // Importar o hook
import './layout.css';
import logger from './utils/logger';

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
  const { hasPatients, loading } = usePatients(); // Usar o contexto
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('name');
    localStorage.removeItem('isAdmin');
    navigate('/login');
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="logo">
          <img src="/LogoFloraisMin.png" alt="Logo Supermercado Florais" />
          <span>Gestão de Crédito</span>
        </div>
        <nav className="nav-links">
          <Link to="/dashboard">Minhas Solicitações</Link>
          <Link to="/patients">Pacientes</Link>
          <Link
            to="/new-request"
            onClick={(e) => {
              if (!loading && !hasPatients) { // Verificar se não está carregando
                e.preventDefault();
                setIsModalOpen(true);
              }
            }}
            style={{ pointerEvents: loading ? 'none' : 'auto' }} // Desabilitar clique enquanto carrega
          >
            Comprar Crédito
          </Link>
          {isAdmin && <Link to="/admin-dashboard">Painel do Admin</Link>}
          {isAdmin && <Link to="/requests">Todas Solicitações</Link>}
        </nav>
        <div className="user-info">
          <div>{name}</div>
          <div className="role">{isAdmin ? 'Administrador' : 'Usuário'}</div>
          <button className="logout" onClick={handleLogout}>Sair</button>
        </div>
      </aside>
      <main className="main-content">
        {children}
      </main>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Atenção"
      >
        <p>Para comprar créditos, você precisa primeiro cadastrar um paciente.</p>
        <button
          onClick={() => {
            setIsModalOpen(false);
            navigate('/patients');
          }}
          style={{
            backgroundColor: '#2e86de',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '1rem',
            marginTop: '1rem'
          }}
        >
          Cadastrar Paciente
        </button>
      </Modal>
    </div>
  );
}
