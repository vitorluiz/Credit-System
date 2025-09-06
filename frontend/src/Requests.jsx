import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from './Layout.jsx';
import RequestDetailsModal from './components/RequestDetailsModal.jsx';
import './Requests.css';

/**
 * Requests page. Displays a searchable and filterable list of credit
 * requests. Admins see all requests while regular users see only
 * their own. Clicking on a row opens a modal with detailed
 * information about the request.
 */
export default function Requests() {
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        const url = isAdmin ? '/api/requests?all=true' : '/api/requests';
        const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
        setRequests(res.data);
        setLoading(false);
      } catch (err) {
        setError('Erro ao carregar solicitações.');
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  function formatCurrency(value) {
    return parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

  // Apply search and status filters
  const filtered = requests.filter(req => {
    const matchesSearch = search
      ? req.payer_name.toLowerCase().includes(search.toLowerCase()) ||
        req.receiver_name.toLowerCase().includes(search.toLowerCase())
      : true;
    const matchesStatus = statusFilter === 'Todos' || req.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <div>
        <h1>Solicitações de Crédito</h1>
        {loading ? (
          <p>Carregando...</p>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="Buscar por nome do pagador ou do recebedor..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: '1 1 300px', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
              />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                <option value="Todos">Todos os Status</option>
                <option value="Pendente">Pendente</option>
                <option value="Processando">Processando</option>
                <option value="Pago">Pago</option>
                <option value="Aprovado">Aprovado</option>
              </select>
            </div>
            <div className="request-list">
              {filtered.map(req => (
                <div key={req.id} className="request-item" style={{ cursor: 'pointer' }} onClick={() => setSelectedRequest(req)}>
                  <div>
                    <strong>{req.receiver_name}</strong> {renderStatusBadge(req.status)}
                    <div style={{ fontSize: '0.8rem', color: '#555' }}>
                      Pagador: {req.payer_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#888' }}>
                      {new Date(req.created_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong>{formatCurrency(req.amount)}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>{req.payment_method}</div>
                  </div>
                </div>
              ))}
            </div>
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
          </>
        )}
      </div>
    </Layout>
  );
}
