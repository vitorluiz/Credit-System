import React from 'react';
import { Link } from 'react-router-dom';
import './NotFound.css';

/**
 * Página 404 - Not Found
 * Exibida quando o usuário acessa uma rota que não existe
 */
export default function NotFound() {
  return (
    <div className="not-found">
      <div className="not-found__container">
        <div className="not-found__content">
          <div className="not-found__icon">🔍</div>
          <h1 className="not-found__title">404</h1>
          <h2 className="not-found__subtitle">Página não encontrada</h2>
          <p className="not-found__description">
            A página que você está procurando não existe ou foi movida.
          </p>
          
          <div className="not-found__actions">
            <Link to="/dashboard" className="btn btn--primary btn--lg">
              <span className="btn__icon">🏠</span>
              Ir para o Dashboard
            </Link>
            
            <Link to="/requests" className="btn btn--secondary btn--lg">
              <span className="btn__icon">📋</span>
              Ver Solicitações
            </Link>
          </div>
          
          <div className="not-found__help">
            <p>Ou você pode:</p>
            <ul>
              <li><Link to="/new-request">Criar nova solicitação</Link></li>
              <li><Link to="/patients">Gerenciar pacientes</Link></li>
              <li><Link to="/login">Fazer login</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
