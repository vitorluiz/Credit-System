import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DesktopLayout from './DesktopLayout.jsx';
import UploadReceipt from '../UploadReceipt.jsx';
import './DesktopNewRequest.css';

/**
 * Desktop New Request component for screens larger than 768px
 * Features enhanced layout with step-by-step process and better UX
 */
export default function DesktopNewRequest() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    payer_name: '',
    payer_cpf: '',
    receiver_name: '',
    receiver_cpf: ''
  });
  const [pixData, setPixData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadPatients();
    loadUserData();
  }, []);

  async function loadPatients() {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/patients', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatients(res.data || []);
    } catch (err) {
      console.error('Error loading patients:', err);
    }
  }

  async function loadUserData() {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserData(res.data);
      // Preencher automaticamente os dados do pagador
      setFormData(prev => ({
        ...prev,
        payer_name: res.data.name,
        payer_cpf: res.data.cpf || ''
      }));
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  }

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  function handlePatientSelect(patient) {
    setSelectedPatient(patient);
    setFormData(prev => ({
      ...prev,
      receiver_name: patient.full_name,
      receiver_cpf: patient.cpf || ''
    }));
    setStep(2);
  }

  function handleNext() {
    if (step === 1 && !selectedPatient) {
      setError('Selecione um paciente para continuar');
      return;
    }
    
    if (step === 2) {
      if (!formData.amount) {
        setError('Preencha o valor da solicitação');
        return;
      }
      
      if (parseFloat(formData.amount) <= 0) {
        setError('O valor deve ser maior que zero');
        return;
      }
    }
    
    setError('');
    setStep(step + 1);
  }

  function handleBack() {
    setError('');
    setStep(step - 1);
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const requestData = {
        amount: parseFloat(formData.amount),
        description: formData.description || 'Solicitação de crédito',
        payerName: formData.payer_name,
        payerCpf: formData.payer_cpf,
        receiverName: formData.receiver_name,
        receiverCpf: formData.receiver_cpf,
        paymentMethod: 'PIX'
      };

      const res = await axios.post('/api/requests', requestData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // O backend retorna os dados PIX dentro de pixData
      setPixData(res.data.pixData);
      setMessage('Solicitação criada com sucesso!');
      setStep(4);
    } catch (err) {
      console.error('Error creating request:', err);
      setError('Erro ao criar solicitação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  function formatCPF(cpf) {
    if (!cpf) return '';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      setMessage('Código PIX copiado para a área de transferência!');
      setTimeout(() => setMessage(''), 3000);
    }).catch(() => {
      setError('Erro ao copiar código PIX');
    });
  }

  function renderStepIndicator() {
    const steps = [
      { number: 1, title: 'Selecionar Paciente', active: step >= 1 },
      { number: 2, title: 'Dados da Solicitação', active: step >= 2 },
      { number: 3, title: 'Gerar PIX', active: step >= 3 },
      { number: 4, title: 'Finalizar', active: step >= 4 }
    ];

    return (
      <div className="step-indicator">
        {steps.map((stepItem, index) => (
          <div key={stepItem.number} className={`step-indicator__item ${stepItem.active ? 'step-indicator__item--active' : ''}`}>
            <div className="step-indicator__number">
              {stepItem.active ? '✓' : stepItem.number}
            </div>
            <div className="step-indicator__title">{stepItem.title}</div>
            {index < steps.length - 1 && <div className="step-indicator__line"></div>}
          </div>
        ))}
      </div>
    );
  }

  function renderStepContent() {
    switch (step) {
      case 1:
        return (
          <div className="step-content">
            <h2 className="step-content__title">Selecionar Paciente</h2>
            <p className="step-content__subtitle">Escolha o paciente que receberá o crédito</p>
            
            {patients.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">👥</div>
                <h3 className="empty-state__title">Nenhum paciente cadastrado</h3>
                <p className="empty-state__description">
                  Você precisa cadastrar um paciente antes de criar uma solicitação.
                </p>
                <button 
                  onClick={() => navigate('/patients')}
                  className="btn btn--primary"
                >
                  Cadastrar Paciente
                </button>
              </div>
            ) : (
              <div className="patients-grid">
                {patients.map(patient => (
                  <div 
                    key={patient.id}
                    className={`patient-card ${selectedPatient?.id === patient.id ? 'patient-card--selected' : ''}`}
                    onClick={() => handlePatientSelect(patient)}
                  >
                    <div className="patient-card__header">
                      <div className="patient-card__avatar">
                        {patient.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="patient-card__info">
                        <h3 className="patient-card__name">{patient.full_name}</h3>
                        <p className="patient-card__id">#{patient.id}</p>
                      </div>
                    </div>
                    <div className="patient-card__details">
                      {patient.cpf && (
                        <div className="patient-card__detail">
                          <span className="patient-card__label">CPF:</span>
                          <span className="patient-card__value">{formatCPF(patient.cpf)}</span>
                        </div>
                      )}
                      {patient.phone && (
                        <div className="patient-card__detail">
                          <span className="patient-card__label">Telefone:</span>
                          <span className="patient-card__value">{patient.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="step-content">
            <h2 className="step-content__title">Dados da Solicitação</h2>
            <p className="step-content__subtitle">Preencha as informações da solicitação de crédito</p>
            
            <div className="form-grid">
              <div className="form-section">
                <h3 className="form-section__title">Recebedor</h3>
                <div className="form-group">
                  <label className="form-label">Nome Completo *</label>
                  <input
                    type="text"
                    name="receiver_name"
                    value={formData.receiver_name}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Nome do recebedor"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">CPF</label>
                  <input
                    type="text"
                    name="receiver_cpf"
                    value={formData.receiver_cpf}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>
              
              <div className="form-section">
                <h3 className="form-section__title">Pagador (Você)</h3>
                <div className="form-group">
                  <label className="form-label">Nome Completo</label>
                  <input
                    type="text"
                    name="payer_name"
                    value={formData.payer_name}
                    className="form-input form-input--disabled"
                    placeholder="Seu nome"
                    disabled
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">CPF</label>
                  <input
                    type="text"
                    name="payer_cpf"
                    value={formData.payer_cpf}
                    className="form-input form-input--disabled"
                    placeholder="Seu CPF"
                    disabled
                    readOnly
                  />
                </div>
              </div>
            </div>
            
            <div className="form-section">
              <h3 className="form-section__title">Valor e Descrição</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Valor *</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="0,00"
                    step="0.01"
                    min="0.01"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Descrição</label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Descrição da solicitação"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="step-content">
            <h2 className="step-content__title">Gerar PIX</h2>
            <p className="step-content__subtitle">Revise os dados e gere o código PIX</p>
            
            <div className="request-summary">
              <div className="request-summary__item">
                <span className="request-summary__label">Recebedor:</span>
                <span className="request-summary__value">{formData.receiver_name}</span>
              </div>
              <div className="request-summary__item">
                <span className="request-summary__label">Pagador:</span>
                <span className="request-summary__value">{formData.payer_name}</span>
              </div>
              <div className="request-summary__item">
                <span className="request-summary__label">Valor:</span>
                <span className="request-summary__value">{formatCurrency(formData.amount)}</span>
              </div>
              {formData.description && (
                <div className="request-summary__item">
                  <span className="request-summary__label">Descrição:</span>
                  <span className="request-summary__value">{formData.description}</span>
                </div>
              )}
            </div>
            
            <div className="step-actions">
              <button onClick={handleSubmit} className="btn btn--primary btn--lg" disabled={loading}>
                {loading ? 'Gerando PIX...' : 'Gerar Código PIX'}
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="step-content">
            <h2 className="step-content__title">PIX Gerado com Sucesso!</h2>
            <p className="step-content__subtitle">Use o código abaixo para realizar o pagamento</p>
            
            {pixData && (
              <div className="pix-container">
                <div className="pix-info">
                  <div className="pix-info__item">
                    <span className="pix-info__label">Valor:</span>
                    <span className="pix-info__value">{formatCurrency(pixData.amount)}</span>
                  </div>
                  <div className="pix-info__item">
                    <span className="pix-info__label">ID da Transação:</span>
                    <span className="pix-info__value">{pixData.transactionId}</span>
                  </div>
                </div>
                
                <div className="pix-code-container">
                  <label className="form-label">Código PIX (Copie e Cole)</label>
                  <div 
                    className="pix-code"
                    onClick={() => copyToClipboard(pixData.pixCode)}
                    title="Clique para copiar"
                  >
                    {pixData.pixCode}
                  </div>
                </div>
                
                <div className="qrcode-container">
                  <label className="form-label">QR Code</label>
                  <div className="qrcode">
                    <img src={pixData.qrCodeDataURL} alt="QR Code PIX" />
                  </div>
                </div>
              </div>
            )}
            
            <div className="step-actions">
              <button 
                onClick={() => navigate('/dashboard')}
                className="btn btn--primary"
              >
                Voltar ao Dashboard
              </button>
              <button 
                onClick={() => {
                  setStep(1);
                  setSelectedPatient(null);
                  setFormData({
                    amount: '',
                    description: '',
                    payer_name: '',
                    payer_cpf: '',
                    receiver_name: '',
                    receiver_cpf: ''
                  });
                  setPixData(null);
                }}
                className="btn btn--secondary"
              >
                Nova Solicitação
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <DesktopLayout>
      <div className="desktop-new-request">
        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-header__title">Nova Solicitação</h1>
          <p className="page-header__subtitle">Crie uma nova solicitação de crédito</p>
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

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Content */}
        <div className="card">
          <div className="card__body">
            {renderStepContent()}
          </div>
        </div>

        {/* Step Navigation */}
        {step < 4 && (
          <div className="step-navigation">
            {step > 1 && (
              <button onClick={handleBack} className="btn btn--ghost">
                ← Voltar
              </button>
            )}
            
            {step < 3 && (
              <button onClick={handleNext} className="btn btn--primary">
                Continuar →
              </button>
            )}
          </div>
        )}

        {/* Upload Receipt (only show after PIX generation) */}
        {step === 4 && pixData && (
          <div className="card">
            <div className="card__body">
              <UploadReceipt requestId={pixData.id} />
            </div>
          </div>
        )}
      </div>
    </DesktopLayout>
  );
}
