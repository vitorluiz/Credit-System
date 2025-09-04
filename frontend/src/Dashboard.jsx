import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from './Layout.jsx';

/**
 * Dashboard page for regular users. Displays summary cards for the
 * user's credit requests and shows a list of the most recent
 * requests. A button to create a new credit request is provided.
 */
export default function Dashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
        setLoading(false);
      } catch (err) {
        setError('Erro ao carregar solicitações.');
        setLoading(false);
      }
    }
    fetchRequests();
  }, [navigate]);

  // Calculate metrics
  const total = requests.length;
  const pending = requests.filter(r => r.status.toLowerCase() === 'pendente').length;
  const paid = requests.filter(r => r.status.toLowerCase() === 'pago' || r.status.toLowerCase() === 'aprovado').length;
  const totalValue = requests.reduce((sum, r) => sum + parseFloat(r.amount), 0);

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
        {loading ? (
          <p>Carregando...</p>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
              <h2>Minhas Solicitações Recentes</h2>
              <Link to="/requests">Ver Todas</Link>
            </div>
            {requests.length === 0 ? (
              <p>Você ainda não possui solicitações.</p>
            ) : (
              <div className="request-list">
                {requests.slice(0, 4).map(req => (
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
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
