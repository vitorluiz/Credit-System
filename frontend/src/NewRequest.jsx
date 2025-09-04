import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from './Layout.jsx';

/**
 * NewRequest page. Presents a form for users to submit a credit
 * request. Requires payer and receiver details, amount and payment
 * method. After a successful creation the user is redirected to
 * their dashboard.
 */
export default function NewRequest() {
  const [useLoggedUserAsPayer, setUseLoggedUserAsPayer] = useState(true);
  const [payerName, setPayerName] = useState('');
  const [payerCpf, setPayerCpf] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverCpf, setReceiverCpf] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  React.useEffect(() => {
    async function loadMe() {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await axios.get('/api/me', { headers: { Authorization: `Bearer ${token}` } });
        if (res.data) {
          setPayerName(res.data.name || '');
          setPayerCpf(res.data.cpf || '');
        }
      } catch {}
    }
    loadMe();
  }, []);

  function onlyDigits(value) {
    return value.replace(/\D/g, '');
  }
  function formatCPF(value) {
    const v = onlyDigits(value).slice(0, 11);
    if (v.length <= 3) return v;
    if (v.length <= 6) return `${v.slice(0,3)}.${v.slice(3)}`;
    if (v.length <= 9) return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6)}`;
    return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9)}`;
  }
  function isValidCPF(raw) {
    const s = onlyDigits(raw);
    if (s.length !== 11 || /^([0-9])\1+$/.test(s)) return false;
    let sum = 0; let rest;
    for (let i = 1; i <= 9; i++) sum += parseInt(s.substring(i-1, i)) * (11 - i);
    rest = (sum * 10) % 11; if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(s.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum += parseInt(s.substring(i-1, i)) * (12 - i);
    rest = (sum * 10) % 11; if (rest === 10 || rest === 11) rest = 0;
    return rest === parseInt(s.substring(10, 11));
  }

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage('');
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      await axios.post(
        '/api/requests',
        {
          payerName,
          payerCpf,
          receiverName,
          receiverCpf,
          amount,
          paymentMethod
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('Solicitação criada com sucesso!');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Erro ao criar a solicitação.');
      }
    }
  };

  return (
    <Layout>
      <div>
        <h1>Enviar Crédito</h1>
        <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
          <h3>Dados do Pagador</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" checked={useLoggedUserAsPayer} onChange={() => setUseLoggedUserAsPayer(!useLoggedUserAsPayer)} />
            Usar meus dados como pagador
          </label>
          {!useLoggedUserAsPayer && (
            <>
              <label>Nome do Pagador *</label>
              <input type="text" value={payerName} onChange={e => setPayerName(e.target.value)} required />
              <label>CPF do Pagador *</label>
              <input type="text" value={payerCpf} onChange={e => setPayerCpf(formatCPF(e.target.value))} required />
            </>
          )}
          {useLoggedUserAsPayer && (
            <div style={{ fontSize: '0.9rem', color: '#555', marginBottom: '0.5rem' }}>
              Pagador: {payerName || '(seu nome)'} — CPF: {payerCpf || '(seu CPF)'}
            </div>
          )}
          <h3 style={{ marginTop: '1rem' }}>Dados do Recebedor</h3>
          <label>Nome de Quem Irá Receber o Crédito *</label>
          <input type="text" value={receiverName} onChange={e => setReceiverName(e.target.value)} required />
          <label>CPF do Recebedor *</label>
          <input type="text" value={receiverCpf} onChange={e => setReceiverCpf(formatCPF(e.target.value))} required />
          {receiverCpf && !isValidCPF(receiverCpf) && <div className="error">CPF do recebedor inválido</div>}
          <h3 style={{ marginTop: '1rem' }}>Valor e Forma de Pagamento</h3>
          <label>Valor (R$) *</label>
          <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
          <label>Forma de Pagamento *</label>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <input type="radio" value="PIX" checked={paymentMethod === 'PIX'} onChange={() => setPaymentMethod('PIX')} />
              PIX - Pagamento instantâneo
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <input type="radio" value="Boleto" checked={paymentMethod === 'Boleto'} onChange={() => setPaymentMethod('Boleto')} />
              Boleto - Crédito liberado após compensação
            </label>
          </div>
          <button type="submit">Enviar Crédito</button>
          {message && <div className="success">{message}</div>}
          {error && <div className="error">{error}</div>}
        </form>
      </div>
    </Layout>
  );
}
