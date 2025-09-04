import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function FirstAccess() {
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
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
      await axios.post('/api/profile', { cpf, phone }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('Dados salvos com sucesso.');
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err) {
      setError('Erro ao salvar os dados.');
    }
  };

  function onlyDigits(value) {
    return value.replace(/\D/g, '');
  }

  function formatCPF(value) {
    const v = onlyDigits(value).slice(0, 11);
    const parts = [];
    if (v.length > 3) parts.push(v.slice(0,3)); else return v;
    if (v.length > 6) parts.push(v.slice(3,6)); else return `${v.slice(0,3)}.${v.slice(3)}`;
    if (v.length > 9) return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9)}`;
    return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6)}`;
  }

  function formatPhone(value) {
    const v = onlyDigits(value).slice(0, 11);
    if (v.length <= 10) {
      // (XX) XXXX-XXXX
      if (v.length <= 2) return `(${v}`;
      if (v.length <= 6) return `(${v.slice(0,2)}) ${v.slice(2)}`;
      return `(${v.slice(0,2)}) ${v.slice(2,6)}-${v.slice(6)}`;
    } else {
      // (XX) XXXXX-XXXX
      return `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
    }
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

  return (
    <div className="container">
      <h1>Primeiro Acesso</h1>
      <p>Informe seu CPF e Telefone para completar o cadastro.</p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="cpf">CPF</label>
        <input id="cpf" type="text" value={cpf} onChange={e => setCpf(formatCPF(e.target.value))} required />
        {!isValidCPF(cpf) && cpf && <div className="error">CPF inválido</div>}
        <label htmlFor="phone">Telefone</label>
        <input id="phone" type="tel" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} required />
        <button type="submit">Salvar</button>
        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}
        <div className="link"><Link to="/dashboard">Pular por agora</Link></div>
      </form>
    </div>
  );
}


