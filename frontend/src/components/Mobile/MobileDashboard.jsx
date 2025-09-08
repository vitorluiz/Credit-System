import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../Layout/Layout';
import RequestDetailsModal from '../RequestDetailsModal.jsx';
import './MobileDashboard.css';

/**
 * Mobile-optimized Dashboard component
 * Implements touch-friendly interface and mobile-first design
 */
export default function MobileDashboard() {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchRequests() {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      try {
        const res = await axios.get('/api/requests', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRequests(res.data);
        setFilteredRequests(res.data);
        setLoading(false);
      } catch (err) {
        setError('Erro ao carregar solicitações.');
        setLoading(false);
      }
    }
    fetchRequests();
  }, [navigate]);

  // Set filtered requests
  useEffect(() => {
    setFilteredRequests(requests);
  }, [requests]);


  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleRequestClick = (request) => {
    setSelectedRequest(request);
  };

  const handleCloseModal = () => {
    setSelectedRequest(null);
  };


  const renderStatusBadge = (status) => {
    const statusConfig = {
      'pendente': { color: 'warning', label: 'Pendente' },
      'pago': { color: 'success', label: 'Pago' },
      'aprovado': { color: 'success', label: 'Aprovado' },
      'processando': { color: 'info', label: 'Processando' },
      'rejeitado': { color: 'error', label: 'Rejeitado' }
    };

    const config = statusConfig[status.toLowerCase()] || { color: 'neutral', label: status };
    
    return (
      <span className={`status-pill status-pill--${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="mobile-dashboard">
          <div className="mobile-dashboard__loading">
            <div className="spinner"></div>
            <p>Carregando suas solicitações...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="mobile-dashboard">
          <div className="mobile-dashboard__error">
            <p className="error-message">{error}</p>
            <button 
              className="btn btn--primary"
              onClick={() => window.location.reload()}
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mobile-dashboard" style={{ 
        padding: '20px', 
        backgroundColor: '#e3f2fd', 
        border: '3px solid #2196f3',
        minHeight: '200px'
      }}>
        
        {/* Page Header */}
        <div className="mobile-dashboard__header">
          <h1 className="mobile-dashboard__title">
            Bem-vindo, {localStorage.getItem('name')}!
          </h1>
          <p className="mobile-dashboard__subtitle">
            Seu painel de solicitações de crédito
          </p>
        </div>

        {/* Mobile Navigation Tabs - User View */}
        <div className="mobile-nav">
          <button 
            className={`mobile-nav__tab ${activeTab === 'dashboard' ? 'mobile-nav__tab--active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="mobile-nav__icon">📊</span>
            <span className="mobile-nav__label">Dashboard</span>
          </button>
          <button 
            className={`mobile-nav__tab ${activeTab === 'patients' ? 'mobile-nav__tab--active' : ''}`}
            onClick={() => setActiveTab('patients')}
          >
            <span className="mobile-nav__icon">👥</span>
            <span className="mobile-nav__label">Pacientes</span>
          </button>
          <button 
            className={`mobile-nav__tab ${activeTab === 'requests' ? 'mobile-nav__tab--active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            <span className="mobile-nav__icon">💳</span>
            <span className="mobile-nav__label">Comprar Crédito</span>
          </button>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'dashboard' && (
          <>
          </>
        )}

        {/* Dashboard Content */}
        {activeTab === 'dashboard' && (
          <>


        {/* Recent Requests */}
        <div className="mobile-dashboard__section">
          <div className="mobile-dashboard__section-header">
            <h2 className="mobile-dashboard__section-title">Últimas 3 Solicitações</h2>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="mobile-dashboard__empty">
              <div className="empty-state">
                <div className="empty-state__icon">📋</div>
                <h3 className="empty-state__title">Nenhuma solicitação</h3>
                <p className="empty-state__description">
                  {(startDate || endDate) 
                    ? 'Nenhuma solicitação encontrada no período selecionado.' 
                    : 'Você ainda não possui solicitações de crédito.'
                  }
                </p>
                <Link to="/new-request" className="btn btn--primary">
                  Criar Primeira Solicitação
                </Link>
              </div>
            </div>
          ) : (
            <div className="mobile-dashboard__requests">
              {filteredRequests.slice(0, 3).map((request) => (
                <div 
                  key={request.id} 
                  className={`request-card request-card--${request.status.toLowerCase()}`}
                  onClick={() => handleRequestClick(request)}
                >
                  <div className="request-card__header">
                    <div className="request-card__amount">
                      {formatCurrency(request.amount)}
                    </div>
                    {renderStatusBadge(request.status)}
                  </div>
                  <div className="request-card__body">
                    <div className="request-card__date">
                      {formatDate(request.created_at)}
                    </div>
                    <div className="request-card__description">
                      {request.description || 'Solicitação de crédito'}
                    </div>
                  </div>
                  <div className="request-card__footer">
                    {request.receipt_url && (
                      <button 
                        className="request-card__receipt-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(request.receipt_url, '_blank');
                        }}
                        title="Visualizar Comprovante"
                      >
                        📄 Comprovante
                      </button>
                    )}
                    <div className="request-card__arrow">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9,18 15,12 9,6"></polyline>
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
          </>
        )}

        {/* Other Tabs Content */}
        {activeTab === 'requests' && (
          <div className="mobile-tab-content">
            <h2>💳 Comprar Crédito</h2>
            <p>Crie uma nova solicitação de crédito</p>
            <button 
              className="btn btn--primary"
              onClick={() => navigate('/new-request')}
            >
              Nova Solicitação
            </button>
          </div>
        )}

        {activeTab === 'patients' && (
          <div className="mobile-tab-content">
            <h2>👥 Pacientes</h2>
            <p>Gerenciar pacientes</p>
            <button 
              className="btn btn--primary"
              onClick={() => navigate('/patients')}
            >
              Ver Pacientes
            </button>
          </div>
        )}


        {/* Request Details Modal */}
        {selectedRequest && (
          <RequestDetailsModal
            request={selectedRequest}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </Layout>
  );
}
