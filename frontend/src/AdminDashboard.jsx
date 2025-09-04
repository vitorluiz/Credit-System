import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from './Layout.jsx';

/**
 * Admin dashboard page. Shows aggregated statistics about all credit
 * requests in the system, including the number of pending and
 * approved requests, total amount requested and number of unique
 * clients. Displays a list of the most recent requests with
 * associated payer and receiver names.
 */
export default function AdminDashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
        setLoading(false);
      } catch (err) {
        setError('Erro ao carregar solicitações.');
        setLoading(false);
      }
    }
    fetchAllRequests();
  }, [navigate]);

  // Compute metrics
  const total = requests.length;
  const pending = requests.filter(r => r.status.toLowerCase() === 'pendente').length;
  const approved = requests.filter(r => r.status.toLowerCase() === 'pago' || r.status.toLowerCase() === 'aprovado').length;
  const totalValue = requests.reduce((sum, r) => sum + parseFloat(r.amount), 0);
  const uniqueClients = new Set(requests.map(r => r.payer_cpf)).size;

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
        {loading ? (
          <p>Carregando...</p>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', margin: '1rem 0' }}>
              <div className="card">
                <h3>Total de Solicitações</h3>
                <p className="big-number">{total}</p>
              </div>
              <div className="card">
                <h3>Pendentes</h3>
                <p className="big-number">{pending}</p>
              </div>
              <div className="card">
                <h3>Aprovados</h3>
                <p className="big-number">{approved}</p>
              </div>
              <div className="card">
                <h3>Valor Total</h3>
                <p className="big-number">{formatCurrency(totalValue)}</p>
              </div>
              <div className="card">
                <h3>Clientes</h3>
                <p className="big-number">{uniqueClients}</p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
              <h2>Últimas Solicitações Recebidas</h2>
              <Link to="/requests">Ver Todas Solicitações</Link>
            </div>
            {requests.length === 0 ? (
              <p>Nenhuma solicitação.</p>
            ) : (
              <div className="request-list">
                {requests.slice(0, 5).map(req => (
                  <div key={req.id} className="request-item">
                    <div>
                      <strong>Recebedor: {req.receiver_name}</strong> {renderStatusBadge(req.status)}
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
      </div>
    </Layout>
  );
}
