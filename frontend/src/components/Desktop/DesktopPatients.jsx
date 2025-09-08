import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DesktopLayout from './DesktopLayout.jsx';
import './DesktopPatients.css';

/**
 * Desktop Patients component for screens larger than 768px
 * Features enhanced layout with table view and advanced filtering
 */
export default function DesktopPatients() {
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPatient, setEditingPatient] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    cpf: '',
    phone: '',
    email: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadPatients();
  }, []);

  async function loadPatients() {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/patients', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatients(res.data || []);
      setFilteredPatients(res.data || []);
      setLoading(false);
    } catch (err) {
      console.error('Error loading patients:', err);
      setError('Erro ao carregar pacientes');
      setLoading(false);
    }
  }

  function formatName(value) {
    // Permitir apenas letras, espaços e acentos
    // Remove caracteres especiais mas mantém espaços
    return value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '').replace(/\s+/g, ' ');
  }

  function validateCPF(cpf) {
    // Se CPF estiver vazio, é válido (campo opcional)
    if (!cpf || cpf.trim() === '') return true;
    
    // Remover formatação para validar apenas os dígitos
    cpf = cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11) return false;
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    // Validar primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf[i]) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf[9])) return false;
    
    // Validar segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf[i]) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf[10])) return false;
    
    return true;
  }

  function handleInputChange(e) {
    const { name, value } = e.target;
    
    if (name === 'fullName') {
      const formatted = formatName(value);
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } else if (name === 'cpf') {
      const digitsOnly = value.replace(/\D/g, '');
      // Limitar a 11 dígitos
      const limitedDigits = digitsOnly.slice(0, 11);
      // Formatar automaticamente: 999.999.999-20
      let formatted = limitedDigits;
      if (limitedDigits.length > 3) {
        formatted = limitedDigits.slice(0, 3) + '.' + limitedDigits.slice(3);
      }
      if (limitedDigits.length > 6) {
        formatted = limitedDigits.slice(0, 3) + '.' + limitedDigits.slice(3, 6) + '.' + limitedDigits.slice(6);
      }
      if (limitedDigits.length > 9) {
        formatted = limitedDigits.slice(0, 3) + '.' + limitedDigits.slice(3, 6) + '.' + limitedDigits.slice(6, 9) + '-' + limitedDigits.slice(9);
      }
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    
    if (!formData.fullName.trim()) {
      setError('Nome completo é obrigatório');
      return;
    }
    
    if (formData.fullName.length < 3) {
      setError('Nome deve ter pelo menos 3 caracteres');
      return;
    }
    
    if (formData.cpf && !validateCPF(formData.cpf)) {
      setError('CPF inválido');
      return;
    }
    
    // Validar email se fornecido
    if (formData.email && formData.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Email inválido');
        return;
      }
    }

    try {
      const token = localStorage.getItem('token');
      
      if (editingPatient) {
        // Update existing patient
        await axios.put(`/api/patients/${editingPatient.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Paciente atualizado com sucesso!');
        setEditingPatient(null);
      } else {
        // Create new patient
        const res = await axios.post('/api/patients', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPatients(prev => [res.data, ...prev]);
        setMessage('Paciente cadastrado com sucesso!');
      }
      
      setFormData({ fullName: '', cpf: '', phone: '', email: '' });
      setError('');
      loadPatients();
    } catch (err) {
      console.error('Error saving patient:', err);
      setError('Erro ao salvar paciente. Tente novamente.');
      setMessage('');
    }
  }

  function handleEdit(patient) {
    setEditingPatient(patient);
    setFormData({
      fullName: patient.full_name || '',
      cpf: patient.cpf || '',
      phone: patient.phone || '',
      email: patient.email || ''
    });
    setError('');
    setMessage('');
  }

  function handleCancelEdit() {
    setEditingPatient(null);
    setFormData({ fullName: '', cpf: '', phone: '', email: '' });
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
      loadPatients();
    } catch (err) {
      console.error('Erro ao excluir paciente:', err);
      setError('Erro ao excluir paciente. Tente novamente.');
      setMessage('');
    }
  }

  function handleSearch(e) {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    
    if (term === '') {
      setFilteredPatients(patients);
    } else {
      const filtered = patients.filter(patient => 
        patient.full_name?.toLowerCase().includes(term) ||
        patient.cpf?.includes(term) ||
        patient.phone?.includes(term) ||
        patient.email?.toLowerCase().includes(term)
      );
      setFilteredPatients(filtered);
    }
  }

  function formatCPF(cpf) {
    if (!cpf) return '';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  function formatPhone(phone) {
    if (!phone) return '';
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }

  if (loading) {
    return (
      <DesktopLayout>
        <div className="desktop-patients">
          <div className="desktop-patients__loading">
            <div className="spinner"></div>
            <p>Carregando pacientes...</p>
          </div>
        </div>
      </DesktopLayout>
    );
  }

  return (
    <DesktopLayout>
      <div className="desktop-patients">
        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-header__title">Pacientes</h1>
          <p className="page-header__subtitle">Gerencie seus pacientes cadastrados</p>
        </div>

        {/* Messages */}
        {message && (
          <div className="alert alert--success">
            <span className="alert__icon">✅</span>
            {message}
          </div>
        )}
        
        {error && (
          <div className="alert alert--error">
            <span className="alert__icon">❌</span>
            {error}
          </div>
        )}

        {/* Patient Form */}
        <div className="card">
          <div className="card__header">
            <h2 className="card__title">
              {editingPatient ? 'Editar Paciente' : 'Cadastrar Novo Paciente'}
            </h2>
            <p className="card__subtitle">
              {editingPatient ? 'Atualize as informações do paciente' : 'Preencha os dados do novo paciente'}
            </p>
          </div>
          
          <div className="card__body">
            <form onSubmit={handleAdd} className="patient-form">
              <div className="form-row">
                <div className="form-group form-group--full">
                  <label className="form-label">Nome Completo *</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Digite o nome completo"
                    maxLength={100}
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">CPF</label>
                  <input
                    type="text"
                    name="cpf"
                    value={formData.cpf}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <div className="phone-input">
                    <span className="phone-input__ddi">+55</span>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="form-input phone-input__number"
                      placeholder="(00) 00000-0000"
                      maxLength={11}
                    />
                  </div>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group form-group--full">
                  <label className="form-label">E-mail</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn btn--primary">
                  {editingPatient ? 'Atualizar Paciente' : 'Cadastrar Paciente'}
                </button>
                
                {editingPatient && (
                  <button 
                    type="button" 
                    onClick={handleCancelEdit}
                    className="btn btn--ghost"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Search and Stats */}
        <div className="desktop-patients__controls">
          <div className="search-box">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearch}
              className="form-input search-box__input"
              placeholder="Buscar pacientes por nome, CPF, telefone ou email..."
            />
            <span className="search-box__icon">🔍</span>
          </div>
          
          <div className="patients-stats">
            <span className="patients-stats__count">
              {filteredPatients.length} de {patients.length} pacientes
            </span>
          </div>
        </div>

        {/* Patients Table */}
        <div className="card">
          <div className="card__header">
            <h2 className="card__title">Lista de Pacientes</h2>
            <p className="card__subtitle">
              {filteredPatients.length === 0 
                ? 'Nenhum paciente encontrado' 
                : `${filteredPatients.length} paciente${filteredPatients.length !== 1 ? 's' : ''} cadastrado${filteredPatients.length !== 1 ? 's' : ''}`
              }
            </p>
          </div>
          
          <div className="card__body">
            {filteredPatients.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">👥</div>
                <h3 className="empty-state__title">
                  {patients.length === 0 ? 'Nenhum paciente cadastrado' : 'Nenhum paciente encontrado'}
                </h3>
                <p className="empty-state__description">
                  {patients.length === 0 
                    ? 'Comece cadastrando seu primeiro paciente usando o formulário acima.'
                    : 'Tente ajustar os termos de busca para encontrar o paciente desejado.'
                  }
                </p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>CPF</th>
                      <th>Telefone</th>
                      <th>E-mail</th>
                      <th>Cadastrado em</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map((patient) => (
                      <tr key={patient.id} className="table__row">
                        <td className="table__name">
                          <div className="patient-name">
                            <span className="patient-name__text">{patient.full_name}</span>
                            <span className="patient-name__id">#{patient.id}</span>
                          </div>
                        </td>
                        <td className="table__cpf">
                          {patient.cpf ? formatCPF(patient.cpf) : '-'}
                        </td>
                        <td className="table__phone">
                          {patient.phone ? formatPhone(patient.phone) : '-'}
                        </td>
                        <td className="table__email">
                          {patient.email || '-'}
                        </td>
                        <td className="table__date">
                          {new Date(patient.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="table__actions">
                          <div className="action-buttons">
                            <button
                              onClick={() => handleEdit(patient)}
                              className="btn btn--ghost btn--sm"
                              title="Editar paciente"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              onClick={() => handleDelete(patient.id)}
                              className="btn btn--danger btn--sm"
                              title="Excluir paciente"
                            >
                              🗑️ Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </DesktopLayout>
  );
}
