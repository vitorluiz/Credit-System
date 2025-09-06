import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from './Layout.jsx';
import RequestDetailsModal from './components/RequestDetailsModal.jsx'; // Caminho corrigido

/**
 * Dashboard page for regular users. Displays summary cards for the
 * user's credit requests and shows a list of the most recent
 * requests. A button to create a new credit request is provided.
 */
export default function Dashboard() {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
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

  const handleStatusUpdate = (requestId, newStatus) => {
    setRequests(prev => prev.map(req => 
      req.id === requestId ? { ...req, status: newStatus } : req
    ));
    setSelectedRequest(prev => prev ? { ...prev, status: newStatus } : null);
  };

  // Calculate metrics (usando dados filtrados)
  const total = filteredRequests.length;
  const pending = filteredRequests.filter(r => r.status.toLowerCase() === 'pendente').length;
  const paid = filteredRequests.filter(r => r.status.toLowerCase() === 'pago' || r.status.toLowerCase() === 'aprovado').length;
  const totalValue = filteredRequests.reduce((sum, r) => sum + parseFloat(r.amount), 0);

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
        <h1>Bem-vindo, {localStorage.getItem('name')}!</h1>
        <p>Este é o seu painel de solicitações de crédito.</p>
        
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
        ) : error ? (
          <p className="error">{error}</p>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', margin: '1rem 0' }}>
              <div className="card">
                <h3>Minhas Solicitações</h3>
                <p className="big-number">{total}</p>
              </div>
              <div className="card">
                <h3>Pendentes</h3>
                <p className="big-number">{pending}</p>
              </div>
              <div className="card">
                <h3>Pagas</h3>
                <p className="big-number">{paid}</p>
              </div>
              <div className="card">
                <h3>Valor Total</h3>
                <p className="big-number">{formatCurrency(totalValue)}</p>
              </div>
            </div>
            {/* Botões removidos; links migrados para o menu lateral */}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
              <h2>Minhas Solicitações Recentes</h2>
              <Link to="/requests">Ver Todas</Link>
            </div>
            {filteredRequests.length === 0 ? (
              <p>Você ainda não possui solicitações {(startDate || endDate) ? 'no período selecionado' : ''}.</p>
            ) : (
              <div className="request-list">
                {filteredRequests.slice(0, 4).map(req => (
                  <div key={req.id} className="request-item">
                    <div>
                      <strong>{req.receiver_name}</strong> {renderStatusBadge(req.status)}
                      <div style={{ fontSize: '0.85rem', color: '#555' }}>
                        Pagador: {req.payer_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#888' }}>
                        {new Date(req.created_at).toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong>{formatCurrency(parseFloat(req.amount))}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#888' }}>{req.payment_method}</div>
                    </div>
                    <div>
                      <button onClick={() => setSelectedRequest(req)}>Ver Detalhes</button>
                      {req.payment_method === 'PIX' && req.status === 'Pendente' && (
                        <button onClick={() => setSelectedRequest(req)} style={{marginLeft: '10px'}}>
                          Enviar Comprovante
                        </button>
                      )}
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
            onStatusUpdate={handleStatusUpdate}
          />
        )}
      </div>
    </Layout>
  );
}
