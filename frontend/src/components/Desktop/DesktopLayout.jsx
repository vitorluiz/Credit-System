import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePatients } from '../../context/PatientContext';
import axios from 'axios';
import ThemeToggle from '../ThemeToggle.jsx';
import './DesktopLayout.css';

/**
 * Desktop Layout component with header + aside + main structure
 * Optimized for screens larger than 768px
 */
export default function DesktopLayout({ children }) {
  const navigate = useNavigate();
  const { hasPatients, loading } = usePatients();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Get user data from localStorage
  const user = {
    name: localStorage.getItem('name') || '',
    isAdmin: localStorage.getItem('isAdmin') === 'true'
  };

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
      localStorage.removeItem('token');
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('name');
      localStorage.removeItem('isAdmin');
      navigate('/login');
    }
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  console.log('DesktopLayout - Rendering with collapsed:', isSidebarCollapsed);
  
  return (
    <div className={`desktop-layout ${isSidebarCollapsed ? 'desktop-layout--collapsed' : ''}`}>
      {/* Header */}
      <header className="desktop-header">
        <div className="desktop-header__left">
          <button 
            className="desktop-header__menu-toggle"
            onClick={toggleSidebar}
            title={isSidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          
          <div className="desktop-header__logo">
            <Link to="/dashboard" className="desktop-header__logo-link">
              <img 
                src="/img/LogoFloraisMin.svg" 
                alt="Logo Florais" 
                className="desktop-header__logo-img"
              />
              <span className="desktop-header__logo-text">Credit System</span>
            </Link>
          </div>
        </div>

        <div className="desktop-header__right">
          <div className="desktop-header__user">
            <div className="desktop-header__user-avatar">
              {getInitials(user.name)}
            </div>
            <div className="desktop-header__user-info">
              <span className="desktop-header__user-name">{user.name}</span>
              <span className="desktop-header__user-role">
                {user.isAdmin ? 'Administrador' : 'Usuário'}
              </span>
            </div>
          </div>
          
          <ThemeToggle />
          
          <button 
            className="desktop-header__logout"
            onClick={handleLogout}
            title="Sair"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16,17 21,12 16,7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </header>

      {/* Aside Menu */}
      <aside className={`desktop-sidebar ${isSidebarCollapsed ? 'desktop-sidebar--collapsed' : ''}`}>
        <nav className="desktop-sidebar__nav">
          <div className="desktop-sidebar__nav-section">
            <h3 className="desktop-sidebar__nav-title">Principal</h3>
            <ul className="desktop-sidebar__nav-list">
              <li className="desktop-sidebar__nav-item">
                <Link 
                  to="/dashboard" 
                  className="desktop-sidebar__nav-link"
                  title="Dashboard"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                  <span className="desktop-sidebar__nav-text">Dashboard</span>
                </Link>
              </li>
              
              <li className="desktop-sidebar__nav-item">
                <Link 
                  to="/patients" 
                  className="desktop-sidebar__nav-link"
                  title="Pacientes"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span className="desktop-sidebar__nav-text">Pacientes</span>
                </Link>
              </li>
              
              <li className="desktop-sidebar__nav-item">
                <Link 
                  to="/new-request" 
                  className="desktop-sidebar__nav-link"
                  title="Nova Solicitação"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                  </svg>
                  <span className="desktop-sidebar__nav-text">Nova Solicitação</span>
                </Link>
              </li>
            </ul>
          </div>

          {user.isAdmin && (
            <div className="desktop-sidebar__nav-section">
              <h3 className="desktop-sidebar__nav-title">Administração</h3>
              <ul className="desktop-sidebar__nav-list">
                <li className="desktop-sidebar__nav-item">
                  <Link 
                    to="/admin" 
                    className="desktop-sidebar__nav-link"
                    title="Painel Admin"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                      <line x1="8" y1="21" x2="16" y2="21"></line>
                      <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                    <span className="desktop-sidebar__nav-text">Painel Admin</span>
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {/* Help Section - positioned above bottom section */}
          <div className="desktop-sidebar__nav-section desktop-sidebar__nav-section--help">
            <h3 className="desktop-sidebar__nav-title">Ajuda</h3>
            <ul className="desktop-sidebar__nav-list">
              <li className="desktop-sidebar__nav-item">
                <Link 
                  to="/help" 
                  className="desktop-sidebar__nav-link"
                  title="Central de Ajuda"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  <span className="desktop-sidebar__nav-text">Central de Ajuda</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* System Section - positioned at bottom */}
          <div className="desktop-sidebar__nav-section desktop-sidebar__nav-section--bottom">
            <h3 className="desktop-sidebar__nav-title">Sistema</h3>
            <ul className="desktop-sidebar__nav-list">
              <li className="desktop-sidebar__nav-item">
                <button 
                  className="desktop-sidebar__nav-link desktop-sidebar__nav-link--logout"
                  onClick={handleLogout}
                  title="Sair do Sistema"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16,17 21,12 16,7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span className="desktop-sidebar__nav-text">Sair</span>
                </button>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="desktop-main">
        <div className="desktop-main__content">
          {children}
        </div>
      </main>
    </div>
  );
}
