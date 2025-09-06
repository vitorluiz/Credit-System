import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from './Layout.jsx';
import logger from './utils/logger';
import { useRecipients } from './context/RecipientContext.jsx'; // Importar o hook

export default function Recipients() {
  const [recipients, setRecipients] = useState([]);
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { refetchRecipients } = useRecipients(); // Usar o contexto
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }
        const res = await axios.get('/api/recipients', { headers: { Authorization: `Bearer ${token}` } });
        setRecipients(res.data || []);
      } catch (err) {
        logger.error('Erro ao buscar pacientes:', err);
        if (err.response && err.response.status === 401) { navigate('/login'); return; }
        setError('Erro ao carregar pacientes');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [navigate]);

  function onlyDigits(v) { return (v || '').replace(/\D/g, ''); }
  function formatCPF(value) {
    const v = onlyDigits(value).slice(0, 11);
    if (v.length <= 3) return v;
    if (v.length <= 6) return `${v.slice(0,3)}.${v.slice(3)}`;
    if (v.length <= 9) return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6)}`;
    return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9)}`;
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!fullName || !cpf) { setError('Informe nome e CPF'); return; }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/recipients', { fullName, cpf: onlyDigits(cpf) }, { headers: { Authorization: `Bearer ${token}` } });
      setRecipients(prev => [res.data, ...prev]);
      setFullName('');
      setCpf('');
      setMessage('Paciente adicionado!');
      refetchRecipients(); // <-- Chamar a função para revalidar o estado global
    } catch (err) {
      logger.error('Erro ao adicionar paciente:', err);
      if (err.response && err.response.status === 401) { navigate('/login'); return; }
      setError('Erro ao adicionar paciente');
    }
  }

  return (
    <Layout>
      <div>
        <h1>Pacientes</h1>
        <p>Gerencie quem pode receber seus créditos.</p>

        <form onSubmit={handleAdd} style={{ maxWidth: '600px' }}>
          <h3>Novo Paciente</h3>
          <label>Nome completo *</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required />
          <label>CPF *</label>
          <input type="text" value={cpf} onChange={e => setCpf(formatCPF(e.target.value))} required />
          <button type="submit">Adicionar</button>
          {message && <div className="success">{message}</div>}
          {error && <div className="error">{error}</div>}
        </form>

        <h3 style={{ marginTop: '1rem' }}>Meus Pacientes</h3>
        {loading ? (
          <p>Carregando...</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {recipients.length === 0 ? (
              <div className="card">Você ainda não cadastrou pacientes.</div>
            ) : (
              recipients.map(r => (
                <div key={r.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{r.full_name}</strong> — {r.cpf}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </Layout>
  );
}


