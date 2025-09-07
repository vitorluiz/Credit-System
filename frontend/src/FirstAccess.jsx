import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function FirstAccess() {
  const [cpf, setCpf] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
      const payload = {
        cpf: onlyDigits(cpf),
      };
      await axios.post('/api/profile', payload, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('Dados salvos com sucesso.');
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err) {
      setError('Erro ao salvar os dados.');
    }
  };

  function onlyDigits(value) {
    return (value || '').replace(/\D/g, '');
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
    if (!s) return false;
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

  return (
    <div className="container">
      <h1>Complete seu Cadastro</h1>
      <div className="alert-info" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <p><strong>Por que precisamos do seu CPF?</strong></p>
        <p>Seu CPF é necessário para ser o pagador na geração dos pagamentos PIX. Ele garante a segurança e a correta identificação das transações.</p>
      </div>
      <form onSubmit={handleSubmit}>
        <label htmlFor="cpf">CPF *</label>
        <input id="cpf" type="text" value={cpf} onChange={e => setCpf(formatCPF(e.target.value))} required />
        {!isValidCPF(cpf) && cpf && <div className="error">CPF inválido</div>}
        <button type="submit" disabled={!isValidCPF(cpf) || !cpf}>Salvar</button>
        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}
      </form>
    </div>
  );
}
