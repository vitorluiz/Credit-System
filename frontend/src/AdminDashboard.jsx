import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from './Layout.jsx';
import RequestDetailsModal from './components/RequestDetailsModal.jsx';

/**
 * Admin dashboard page. Shows aggregated statistics about all credit
 * requests in the system, including the number of pending and
 * approved requests, total amount requested and number of unique
 * clients. Displays a list of the most recent requests with
 * associated payer and receiver names.
 */
export default function AdminDashboard() {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchAllRequests() {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      try {
        const res = await axios.get('/api/requests?all=true', {
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
    fetchAllRequests();
  }, [navigate]);

  // Aplicar filtro de data
  useEffect(() => {
    let filtered = requests;
    
    if (startDate || endDate) {
      filtered = requests.filter(req => {
        const requestDate = new Date(req.created_at);
        const start = startDate ? new Date(startDate + 'T00:00:00') : null;
        const end = endDate ? new Date(endDate + 'T23:59:59') : null;
        
        if (start && requestDate < start) return false;
        if (end && requestDate > end) return false;
        return true;
      });
    }
    
    setFilteredRequests(filtered);
  }, [requests, startDate, endDate]);

  // Compute metrics (usando dados filtrados)
  const total = filteredRequests.length;
  const pending = filteredRequests.filter(r => r.status.toLowerCase() === 'pendente').length;
  const approved = filteredRequests.filter(r => r.status.toLowerCase() === 'pago' || r.status.toLowerCase() === 'aprovado').length;
  const canceled = filteredRequests.filter(r => r.status.toLowerCase() === 'cancelado').length;
  const reversed = filteredRequests.filter(r => r.status.toLowerCase() === 'estornado').length;
  
  const totalValue = filteredRequests.reduce((sum, r) => sum + parseFloat(r.amount), 0);
  const paidValue = filteredRequests
    .filter(r => r.status.toLowerCase() === 'pago')
    .reduce((sum, r) => sum + parseFloat(r.amount), 0);
  const canceledValue = filteredRequests
    .filter(r => r.status.toLowerCase() === 'cancelado')
    .reduce((sum, r) => sum + parseFloat(r.amount), 0);
  const reversedValue = filteredRequests
    .filter(r => r.status.toLowerCase() === 'estornado')
    .reduce((sum, r) => sum + parseFloat(r.amount), 0);
    
  const uniqueClients = new Set(filteredRequests.map(r => r.payer_cpf)).size;

  function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function renderStatusBadge(status) {
    const lower = status.toLowerCase();
    let color;
    if (lower === 'pendente') color = '#f1c40f';
    else if (lower === 'pago' || lower === 'aprovado') color = '#27ae60';
    else if (lower === 'processando') color = '#2980b9';
    else color = '#7f8c8d';
    return (
      <span style={{ backgroundColor: color + '33', color: color, padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
        {status}
      </span>
    );
  }

  return (
    <Layout>
      <div>
        <h1>Painel do Administrador</h1>
        <p>Visão geral de todas as operações</p>
        
        {/* Filtros de Data */}
        <div style={{ 
          background: '#f8f9fa', 
          padding: '1rem', 
          borderRadius: '8px', 
          margin: '1rem 0',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div>
            <label style={{ marginRight: '0.5rem', fontWeight: 'bold' }}>📅 Filtrar por período:</label>
          </div>
          <div>
            <label style={{ marginRight: '0.5rem' }}>De:</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>
          <div>
            <label style={{ marginRight: '0.5rem' }}>Até:</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>
          <button 
            onClick={() => { setStartDate(''); setEndDate(''); }}
            style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: '#6c757d', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Limpar Filtros
          </button>
        </div>
        
        {loading ? (
          <p>Carregando...</p>
        ) : (
          <>
            {/* Primeira linha de cards */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', margin: '1rem 0' }}>
              <div className="card" style={{ flex: '1', minWidth: '200px' }}>
                <h3>Total de Solicitações</h3>
                <p className="big-number">{total}</p>
              </div>
              <div className="card" style={{ flex: '1', minWidth: '200px' }}>
                <h3>Pendentes</h3>
                <p className="big-number">{pending}</p>
              </div>
              <div className="card" style={{ flex: '1', minWidth: '200px' }}>
                <h3>Aprovados</h3>
                <p className="big-number">{approved}</p>
              </div>
              <div className="card" style={{ flex: '1', minWidth: '200px' }}>
                <h3>Clientes</h3>
                <p className="big-number">{uniqueClients}</p>
              </div>
            </div>

            {/* Segunda linha de cards */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', margin: '1rem 0' }}>
              <div className="card" style={{ 
                flex: '1', 
                minWidth: '200px',
                backgroundColor: '#d4edda', 
                borderLeft: '4px solid #28a745' 
              }}>
                <h3 style={{ color: '#155724' }}>💰 Valor Total Recebido</h3>
                <p className="big-number" style={{ color: '#155724' }}>{formatCurrency(paidValue)}</p>
                <small style={{ color: '#6c757d' }}>Apenas boletos pagos</small>
              </div>
              <div className="card" style={{ 
                flex: '1', 
                minWidth: '200px',
                backgroundColor: '#f8d7da', 
                borderLeft: '4px solid #dc3545' 
              }}>
                <h3 style={{ color: '#721c24' }}>❌ Valor Total Cancelado</h3>
                <p className="big-number" style={{ color: '#721c24' }}>{formatCurrency(canceledValue)}</p>
                <small style={{ color: '#6c757d' }}>{canceled} solicitações canceladas</small>
              </div>
              <div className="card" style={{ 
                flex: '1', 
                minWidth: '200px',
                backgroundColor: '#e2e3f0', 
                borderLeft: '4px solid #6f42c1' 
              }}>
                <h3 style={{ color: '#3d1a78' }}>🔄 Valor Total Estornado</h3>
                <p className="big-number" style={{ color: '#3d1a78' }}>{formatCurrency(reversedValue)}</p>
                <small style={{ color: '#6c757d' }}>{reversed} solicitações estornadas</small>
              </div>
              <div className="card" style={{ flex: '1', minWidth: '200px' }}>
                <h3>Valor Total</h3>
                <p className="big-number">{formatCurrency(totalValue)}</p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
              <h2>Últimas Solicitações Recebidas</h2>
              <Link to="/requests">Ver Todas Solicitações</Link>
            </div>
            {filteredRequests.length === 0 ? (
              <p>Nenhuma solicitação {(startDate || endDate) ? 'no período selecionado' : ''}.</p>
            ) : (
              <div className="request-list">
                {filteredRequests.slice(0, 5).map(req => (
                  <div 
                    key={req.id} 
                    className="request-item" 
                    onClick={() => setSelectedRequest(req)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div>
                      <strong>Paciente: {req.receiver_name}</strong> {renderStatusBadge(req.status)}
                      <div style={{ fontSize: '0.8rem', color: '#555' }}>
                        Pagador: {req.payer_name} (Criado por: {req.creator_email})
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#888' }}>
                        {new Date(req.created_at).toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong>{formatCurrency(parseFloat(req.amount))}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {selectedRequest && (
          <RequestDetailsModal 
            request={selectedRequest} 
            onClose={() => setSelectedRequest(null)}
            onStatusUpdate={(id, newStatus) => {
              // Atualiza o status localmente
              setRequests(prev => prev.map(req => 
                req.id === id ? { ...req, status: newStatus } : req
              ));
              setSelectedRequest(prev => prev ? { ...prev, status: newStatus } : null);
            }}
          />
        )}
      </div>
    </Layout>
  );
}
