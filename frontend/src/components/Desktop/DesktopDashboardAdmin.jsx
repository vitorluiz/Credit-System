import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import DesktopLayout from './DesktopLayout.jsx';
import RequestDetailsModal from '../RequestDetailsModal.jsx';
import './DesktopDashboard.css';

/**
 * Desktop Admin Dashboard component for screens larger than 768px
 * Features enhanced layout with administrative statistics and comprehensive request management
 */
export default function DesktopDashboard() {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalValue: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchRequests() {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      try {
        // Buscar TODAS as solicitações do sistema (visão administrativa)
        const res = await axios.get('/api/requests?all=true', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRequests(res.data);
        setFilteredRequests(res.data);
        calculateStats(res.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching requests:', err);
        if (err.response && err.response.status === 401) {
          navigate('/login');
          return;
        }
        setError('Erro ao carregar solicitações');
        setLoading(false);
      }
    }
    fetchRequests();
  }, [navigate]);

  function calculateStats(requests) {
    // Calcular usuários únicos (baseado no user_id)
    const uniqueUserIds = new Set(requests.map(r => r.user_id).filter(Boolean));
    
    const stats = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'Pendente').length,
      approved: requests.filter(r => r.status === 'Pago' || r.status === 'Aprovado').length,
      rejected: requests.filter(r => r.status === 'Rejeitado').length,
      totalValue: requests.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0),
      uniqueUsers: uniqueUserIds.size
    };
    setStats(stats);
  }

  function handleRequestClick(request) {
    setSelectedRequest(request);
  }

  function handleCloseModal() {
    setSelectedRequest(null);
  }

  function handleStatusUpdate(newStatus) {
    if (selectedRequest) {
      setSelectedRequest({ ...selectedRequest, status: newStatus });
      // Update the request in the list
      setRequests(prev => prev.map(r => 
        r.id === selectedRequest.id ? { ...r, status: newStatus } : r
      ));
      setFilteredRequests(prev => prev.map(r => 
        r.id === selectedRequest.id ? { ...r, status: newStatus } : r
      ));
      calculateStats(requests.map(r => 
        r.id === selectedRequest.id ? { ...r, status: newStatus } : r
      ));
    }
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('pt-BR');
  }

  function getStatusColor(status) {
    const colors = {
      'Pendente': '#ff9800',
      'Pago': '#4caf50',
      'Aprovado': '#4caf50',
      'Rejeitado': '#f44336',
      'Processando': '#2196f3'
    };
    return colors[status] || '#666';
  }

  function renderStatusBadge(status) {
    const color = getStatusColor(status);
    return (
      <span 
        className="status-pill" 
        style={{ 
          backgroundColor: color + '20', 
          color: color,
          border: `1px solid ${color}40`
        }}
      >
        {status}
      </span>
    );
  }

  function handleFilter() {
    let filtered = [...requests];
    
    if (startDate) {
      filtered = filtered.filter(r => new Date(r.created_at) >= new Date(startDate));
    }
    
    if (endDate) {
      filtered = filtered.filter(r => new Date(r.created_at) <= new Date(endDate));
    }
    
    setFilteredRequests(filtered);
  }

  function clearFilter() {
    setStartDate('');
    setEndDate('');
    setFilteredRequests(requests);
  }

  if (loading) {
    return (
      <DesktopLayout>
        <div className="desktop-dashboard">
          <div className="desktop-dashboard__loading">
            <div className="spinner"></div>
            <p>Carregando dashboard...</p>
          </div>
        </div>
      </DesktopLayout>
    );
  }

  if (error) {
    return (
      <DesktopLayout>
        <div className="desktop-dashboard">
          <div className="desktop-dashboard__error">
            <p className="error-message">{error}</p>
            <button 
              className="btn btn--primary"
              onClick={() => window.location.reload()}
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </DesktopLayout>
    );
  }

  return (
    <DesktopLayout>
      <div className="desktop-dashboard">
        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-header__title">Painel Administrativo</h1>
          <p className="page-header__subtitle">Visão geral de todas as solicitações do sistema</p>
        </div>

        {/* Statistics Cards */}
        <div className="stats-grid">
          <div className="stat-card stat-card--primary">
            <div className="stat-card__icon">📊</div>
            <div className="stat-card__content">
              <h3 className="stat-card__title">Total de Solicitações</h3>
              <p className="stat-card__value">{stats.total}</p>
            </div>
          </div>

          <div className="stat-card stat-card--warning">
            <div className="stat-card__icon">⏳</div>
            <div className="stat-card__content">
              <h3 className="stat-card__title">Pendentes</h3>
              <p className="stat-card__value">{stats.pending}</p>
            </div>
          </div>

          <div className="stat-card stat-card--success">
            <div className="stat-card__icon">✅</div>
            <div className="stat-card__content">
              <h3 className="stat-card__title">Aprovadas</h3>
              <p className="stat-card__value">{stats.approved}</p>
            </div>
          </div>

          <div className="stat-card stat-card--info">
            <div className="stat-card__icon">💰</div>
            <div className="stat-card__content">
              <h3 className="stat-card__title">Valor Total</h3>
              <p className="stat-card__value">{formatCurrency(stats.totalValue)}</p>
            </div>
          </div>

          <div className="stat-card stat-card--secondary">
            <div className="stat-card__icon">👥</div>
            <div className="stat-card__content">
              <h3 className="stat-card__title">Usuários Únicos</h3>
              <p className="stat-card__value">{stats.uniqueUsers || 0}</p>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="desktop-dashboard__actions">
          <Link to="/new-request" className="btn btn--primary btn--lg">
            <span className="btn__icon">➕</span>
            Nova Solicitação
          </Link>
          
          <div className="desktop-dashboard__filters">
            <div className="filter-group">
              <label className="form-label">Data Inicial</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="form-input"
              />
            </div>
            
            <div className="filter-group">
              <label className="form-label">Data Final</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="form-input"
              />
            </div>
            
            <button 
              onClick={handleFilter}
              className="btn btn--secondary"
            >
              Filtrar
            </button>
            
            <button 
              onClick={clearFilter}
              className="btn btn--ghost"
            >
              Limpar
            </button>
          </div>
        </div>

        {/* Requests Table */}
        <div className="card">
          <div className="card__header">
            <h2 className="card__title">Todas as Solicitações do Sistema</h2>
            <p className="card__subtitle">
              {filteredRequests.length} de {requests.length} solicitações (visão administrativa)
            </p>
          </div>
          
          <div className="card__body">
            {filteredRequests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">📋</div>
                <h3 className="empty-state__title">Nenhuma solicitação encontrada</h3>
                <p className="empty-state__description">
                  {requests.length === 0 
                    ? 'Nenhuma solicitação foi criada no sistema ainda.'
                    : 'Nenhuma solicitação corresponde aos filtros aplicados.'
                  }
                </p>
                {requests.length === 0 && (
                  <Link to="/new-request" className="btn btn--primary">
                    Criar Primeira Solicitação
                  </Link>
                )}
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Valor</th>
                      <th>Status</th>
                      <th>Usuário</th>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((request) => (
                      <tr key={request.id} className="table__row">
                        <td className="table__id">#{request.id}</td>
                        <td className="table__amount">{formatCurrency(request.amount)}</td>
                        <td className="table__status">
                          {renderStatusBadge(request.status)}
                        </td>
                        <td className="table__user">
                          {request.creator_name || 'Usuário não identificado'}
                        </td>
                        <td className="table__date">{formatDate(request.created_at)}</td>
                        <td className="table__description">
                          {request.description || 'Solicitação de crédito'}
                        </td>
                        <td className="table__actions">
                          <button
                            onClick={() => handleRequestClick(request)}
                            className="btn btn--ghost btn--sm"
                          >
                            Ver Detalhes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Request Details Modal */}
        {selectedRequest && (
          <RequestDetailsModal
            request={selectedRequest}
            onClose={handleCloseModal}
            onStatusUpdate={handleStatusUpdate}
          />
        )}
      </div>
    </DesktopLayout>
  );
}
