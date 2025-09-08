import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from './Layout.jsx';
import logger from './utils/logger';
import { usePatients } from './context/PatientContext.jsx'; // Importar o hook
import './Patients.css';

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingPatient, setEditingPatient] = useState(null);
  const { refetchPatients } = usePatients(); // Usar o contexto
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }
        const res = await axios.get('/api/patients', { headers: { Authorization: `Bearer ${token}` } });
        setPatients(res.data || []);
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

  function formatName(value) {
    // Remove números e caracteres especiais, mantém apenas letras e espaços
    return value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
  }

  function validateCPF(cpf) {
    const digits = onlyDigits(cpf);
    if (digits.length === 0) return true; // CPF é opcional
    if (digits.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(digits)) return false;
    
    // Validação do CPF
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(digits.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(digits.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(digits.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(digits.charAt(10))) return false;
    
    return true;
  }

  function handleEdit(patient) {
    setEditingPatient(patient);
    setFullName(patient.full_name);
    setCpf(patient.cpf || '');
    setError('');
    setMessage('');
  }

  function handleCancelEdit() {
    setEditingPatient(null);
    setFullName('');
    setCpf('');
    setError('');
    setMessage('');
  }

  async function handleDelete(patientId) {
    if (!window.confirm('Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/patients/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('Paciente excluído com sucesso!');
      setError('');
      
      // Atualizar lista de pacientes
      const res = await axios.get('/api/patients', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatients(res.data || []);
      
    } catch (err) {
      console.error('Erro ao excluir paciente:', err);
      setError('Erro ao excluir paciente. Tente novamente.');
      setMessage('');
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    
    // Validações
    if (!fullName.trim()) { 
      setError('O nome completo é obrigatório'); 
      return; 
    }
    
    if (fullName.trim().length < 2) {
      setError('O nome deve ter pelo menos 2 caracteres');
      return;
    }
    
    if (cpf && !validateCPF(cpf)) {
      setError('CPF inválido');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      if (editingPatient) {
        // Editar paciente existente
        const res = await axios.put(`/api/patients/${editingPatient.id}`, { 
          fullName: fullName.trim(), 
          cpf: onlyDigits(cpf) 
        }, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        
        setRecipients(prev => prev.map(p => 
          p.id === editingPatient.id ? res.data : p
        ));
        setMessage('Paciente atualizado com sucesso!');
      } else {
        // Adicionar novo paciente
        const res = await axios.post('/api/patients', { 
          fullName: fullName.trim(), 
          cpf: onlyDigits(cpf) 
        }, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        
        setPatients(prev => [res.data, ...prev]);
        setMessage('Paciente adicionado com sucesso!');
      }
      
      handleCancelEdit();
      refetchPatients();
    } catch (err) {
      logger.error('Erro ao salvar paciente:', err);
      if (err.response && err.response.status === 401) { navigate('/login'); return; }
      setError(editingPatient ? 'Erro ao atualizar paciente' : 'Erro ao adicionar paciente');
    }
  }

  return (
    <Layout>
      <div className="patients">
        <div className="patients__container">
          {/* Header */}
          <div className="patients__header">
            <h1 className="patients__title">Pacientes</h1>
            <p className="patients__subtitle">Gerencie quem pode receber seus créditos</p>
          </div>

          {/* Add/Edit Patient Form */}
          <div className="patients__form-section">
            <div className="patients__form-card">
              <h2 className="patients__form-title">
                {editingPatient ? 'Editar Paciente' : 'Novo Paciente'}
              </h2>
              <form className="patients__form" onSubmit={handleAdd}>
                <div className="form-group">
                  <label htmlFor="fullName" className="form-label">Nome completo *</label>
                  <input 
                    id="fullName"
                    type="text" 
                    className="form-input"
                    value={fullName} 
                    onChange={e => setFullName(formatName(e.target.value))} 
                    placeholder="Digite o nome completo"
                    maxLength={100}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cpf" className="form-label">CPF (Opcional)</label>
                  <input 
                    id="cpf"
                    type="text" 
                    className="form-input"
                    value={cpf} 
                    onChange={e => setCpf(formatCPF(e.target.value))} 
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>

                <div className="patients__form-actions">
                  <button type="submit" className="btn btn--primary">
                    {editingPatient ? 'Atualizar Paciente' : 'Adicionar Paciente'}
                  </button>
                  
                  {editingPatient && (
                    <button 
                      type="button" 
                      className="btn btn--ghost"
                      onClick={handleCancelEdit}
                    >
                      Cancelar
                    </button>
                  )}
                </div>

                {/* Messages */}
                {message && (
                  <div className="alert alert--success">
                    <div className="alert__icon">✅</div>
                    <div className="alert__content">{message}</div>
                  </div>
                )}

                {error && (
                  <div className="alert alert--error">
                    <div className="alert__icon">❌</div>
                    <div className="alert__content">{error}</div>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Patients List */}
          <div className="patients__list-section">
            <h2 className="patients__list-title">Meus Pacientes</h2>
            
            {loading ? (
              <div className="patients__loading">
                <div className="loading-spinner"></div>
                <p>Carregando pacientes...</p>
              </div>
            ) : (
              <div className="patients__list">
                {patients.length === 0 ? (
                  <div className="patients__empty">
                    <div className="empty-state">
                      <div className="empty-state__icon">👥</div>
                      <h3 className="empty-state__title">Nenhum paciente cadastrado</h3>
                      <p className="empty-state__description">
                        Adicione pacientes para poder enviar créditos
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="patients__grid">
                    {patients.map(patient => (
                      <div key={patient.id} className="patient-card">
                        <div className="patient-card__header">
                          <div className="patient-card__avatar">
                            {patient.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="patient-card__info">
                            <h3 className="patient-card__name">{patient.full_name}</h3>
                            <p className="patient-card__cpf">{patient.cpf || 'CPF não informado'}</p>
                          </div>
                        </div>
                        <div className="patient-card__actions">
                          <button 
                            className="btn btn--ghost btn--sm"
                            onClick={() => handleEdit(patient)}
                          >
                            Editar
                          </button>
                          <button
                            className="btn btn--danger btn--sm"
                            onClick={() => handleDelete(patient.id)}
                            title="Excluir paciente"
                          >
                            🗑️ Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}


