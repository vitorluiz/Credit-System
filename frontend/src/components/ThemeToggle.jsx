import React, { useState, useEffect } from 'react';
import './ThemeToggle.css';

/**
 * Theme Toggle Component
 * Allows users to switch between light and dark themes
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    // Verificar se há tema salvo no localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme;
    }
    
    // Se não há tema salvo, usar preferência do sistema
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  });

  useEffect(() => {
    // Aplicar tema ao documento
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <button 
      className="theme-toggle"
      onClick={toggleTheme}
      title={`Alternar para tema ${theme === 'light' ? 'escuro' : 'claro'}`}
      aria-label={`Alternar para tema ${theme === 'light' ? 'escuro' : 'claro'}`}
    >
      <div className="theme-toggle__track">
        <div className={`theme-toggle__thumb ${theme === 'dark' ? 'theme-toggle__thumb--dark' : ''}`}>
          <div className="theme-toggle__icon">
            {theme === 'light' ? (
              // Ícone do sol (tema claro)
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            ) : (
              // Ícone da lua (tema escuro)
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
