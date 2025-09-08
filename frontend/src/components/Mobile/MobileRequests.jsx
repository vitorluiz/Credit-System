import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../Layout/Layout';
import RequestDetailsModal from '../RequestDetailsModal.jsx';
import './MobileRequests.css';

/**
 * Mobile-optimized Requests component
 * Shows all requests with mobile-friendly interface
 */
export default function MobileRequests() {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
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

  // Apply filters
  useEffect(() => {
    let filtered = requests;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(req => 
        req.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.amount?.toString().includes(searchTerm) ||
        req.status?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.status === statusFilter);
    }

    setFilteredRequests(filtered);
  }, [requests, searchTerm, statusFilter]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRequestClick = (request) => {
    setSelectedRequest(request);
  };

  const handleCloseModal = () => {
    setSelectedRequest(null);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
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

  const statusOptions = [
    { value: 'all', label: 'Todas' },
    { value: 'pendente', label: 'Pendentes' },
    { value: 'pago', label: 'Pagas' },
    { value: 'aprovado', label: 'Aprovadas' },
    { value: 'processando', label: 'Processando' },
    { value: 'rejeitado', label: 'Rejeitadas' }
  ];

  if (loading) {
    return (
      <Layout>
        <div className="mobile-requests">
          <div className="mobile-requests__loading">
            <div className="spinner"></div>
            <p>Carregando solicitações...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="mobile-requests">
          <div className="mobile-requests__error">
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
      <div className="mobile-requests">
        {/* Page Header */}
        <div className="mobile-requests__header">
          <h1 className="mobile-requests__title">Todas as Solicitações</h1>
          <p className="mobile-requests__subtitle">
            {filteredRequests.length} de {requests.length} solicitações
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="mobile-requests__search-bar">
          <div className="search-input">
            <svg className="search-input__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              className="search-input__field"
              placeholder="Buscar solicitações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            className={`btn btn--outline ${showFilters ? 'btn--active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"></polygon>
            </svg>
            Filtros
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mobile-requests__filters">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select 
                className="form-input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mobile-requests__filter-actions">
              <button 
                className="btn btn--ghost"
                onClick={clearFilters}
              >
                Limpar
              </button>
              <button 
                className="btn btn--primary"
                onClick={() => setShowFilters(false)}
              >
                Aplicar
              </button>
            </div>
          </div>
        )}

        {/* Requests List */}
        <div className="mobile-requests__list">
          {filteredRequests.length === 0 ? (
            <div className="mobile-requests__empty">
              <div className="empty-state">
                <div className="empty-state__icon">🔍</div>
                <h3 className="empty-state__title">Nenhuma solicitação encontrada</h3>
                <p className="empty-state__description">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Tente ajustar os filtros de busca.'
                    : 'Você ainda não possui solicitações de crédito.'
                  }
                </p>
                {(searchTerm || statusFilter !== 'all') && (
                  <button 
                    className="btn btn--outline"
                    onClick={clearFilters}
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="requests-list">
              {filteredRequests.map((request) => (
                <div 
                  key={request.id} 
                  className="request-item"
                  onClick={() => handleRequestClick(request)}
                >
                  <div className="request-item__header">
                    <div className="request-item__amount">
                      {formatCurrency(request.amount)}
                    </div>
                    {renderStatusBadge(request.status)}
                  </div>
                  <div className="request-item__body">
                    <div className="request-item__date">
                      {formatDate(request.created_at)}
                    </div>
                    <div className="request-item__description">
                      {request.description || 'Solicitação de crédito'}
                    </div>
                  </div>
                  <div className="request-item__footer">
                    <div className="request-item__arrow">
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
