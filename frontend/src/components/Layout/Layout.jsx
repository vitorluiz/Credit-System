import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePatients } from '../../context/PatientContext';
import Modal from '../Modal/Modal';
import axios from 'axios';
import './Layout.css';

/**
 * Layout component providing a sidebar navigation and a content area.
 * Implements responsive design with mobile drawer navigation.
 */
export default function Layout({ children }) {
  const navigate = useNavigate();
  const { hasPatients, loading } = usePatients();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Get user data from localStorage
  const user = {
    name: localStorage.getItem('name') || '',
    isAdmin: localStorage.getItem('isAdmin') === 'true'
  };

  // Close mobile menu on escape key and prevent body scroll
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await axios.post('/api/logout', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (err) {
      console.error('Error during logout:', err);
    } finally {
      // Limpar localStorage independente do resultado da API
      localStorage.removeItem('token');
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('name');
      localStorage.removeItem('isAdmin');
      navigate('/login');
    }
  };

  const handleNewRequestClick = (e) => {
    if (!loading && !user.isAdmin && !hasPatients) {
      e.preventDefault();
      setIsModalOpen(true);
    } else {
      setIsMobileMenuOpen(false);
    }
  };

  const NavLinks = () => (
    <>
      <Link 
        to="/dashboard" 
        className="nav__link"
        onClick={() => setIsMobileMenuOpen(false)}
      >
        🏠 Início
      </Link>
      <Link 
        to="/dashboard" 
        className="nav__link"
        onClick={() => setIsMobileMenuOpen(false)}
      >
        Minhas Solicitações
      </Link>
      <Link 
        to="/patients" 
        className="nav__link"
        onClick={() => setIsMobileMenuOpen(false)}
      >
        Pacientes
      </Link>
      <Link
        to="/new-request"
        className="nav__link"
        onClick={handleNewRequestClick}
        style={{ pointerEvents: loading ? 'none' : 'auto' }}
      >
        Comprar Crédito
      </Link>
      {user.isAdmin && (
        <>
          <Link 
            to="/admin-dashboard" 
            className="nav__link"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Painel do Admin
          </Link>
          <Link 
            to="/requests" 
            className="nav__link"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Todas Solicitações
          </Link>
        </>
      )}
    </>
  );

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        {/* Desktop Sidebar */}
        <aside className="sidebar">
          <div className="sidebar__header">
            <img 
              src="/img/LogoFloraisMin.svg" 
              alt="Logo Supermercado Florais" 
              className="sidebar__logo"
              onClick={() => navigate('/dashboard')}
              style={{ cursor: 'pointer' }}
            />
            <h1 className="sidebar__title">Gestão de Crédito</h1>
          </div>

          <nav className="sidebar__nav">
            <NavLinks />
          </nav>

          <div className="sidebar__footer">
            <div className="sidebar__user">
              <div className="sidebar__user-avatar">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="sidebar__user-info">
                <p className="sidebar__user-name">{user.name}</p>
                <p className="sidebar__user-role">
                  {user.isAdmin ? 'Administrador' : 'Usuário'}
                </p>
              </div>
            </div>
            <button 
              className="btn btn--danger btn--sm" 
              onClick={handleLogout}
            >
              Sair
            </button>
          </div>
        </aside>

        {/* Mobile Menu Toggle */}
        <button
          className="sidebar_toggle hidden-desktop"
          aria-label="Abrir menu de navegação"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </header>

      {/* Mobile Backdrop */}
      <div 
        className={`mobile-backdrop ${isMobileMenuOpen ? 'mobile-backdrop--open' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Drawer */}
      <div className={`mobile-drawer ${isMobileMenuOpen ? 'mobile-drawer--open' : ''}`}>
        <div className="mobile-drawer__header">
          <h2 className="mobile-drawer__title">Menu</h2>
          <button
            className="mobile-drawer__close"
            aria-label="Fechar menu"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <nav className="mobile-drawer__nav">
          <NavLinks />
        </nav>

        <div className="mobile-drawer__footer">
          <div className="mobile-drawer__user">
            <div className="mobile-drawer__user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="mobile-drawer__user-info">
              <p className="mobile-drawer__user-name">{user.name}</p>
              <p className="mobile-drawer__user-role">
                {user.isAdmin ? 'Administrador' : 'Usuário'}
              </p>
            </div>
          </div>
          <button 
            className="btn btn--danger" 
            onClick={() => {
              setIsMobileMenuOpen(false);
              handleLogout();
            }}
          >
            Sair
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="main">
        <div className="main__content">
          {children}
        </div>
      </main>

      {/* Modal for new users without patients */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Atenção"
      >
        <p>Para comprar créditos, você precisa primeiro cadastrar um paciente.</p>
        <div className="modal__footer">
          <button
            className="btn btn--outline"
            onClick={() => setIsModalOpen(false)}
          >
            Cancelar
          </button>
          <button
            className="btn btn--primary"
            onClick={() => {
              setIsModalOpen(false);
              navigate('/patients');
            }}
          >
            Cadastrar Paciente
          </button>
        </div>
      </Modal>
    </div>
  );
}
