import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from './Layout.jsx';
import './NewRequest.css';
import logger from './utils/logger.js';

export default function NewRequest() {
  // Estados do Componente
  const [step, setStep] = useState('form'); // 3 passos: 'form', 'review', 'pix'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estados do Formulário
  const [payerName, setPayerName] = useState('');
  const [payerCpf, setPayerCpf] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverCpf, setReceiverCpf] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [recipients, setRecipients] = useState([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState('');

  // Estados do Pagamento
  const [pixData, setPixData] = useState(null);
  const [currentRequestId, setCurrentRequestId] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  const navigate = useNavigate();

  // Efeito para carregar dados iniciais
  useEffect(() => {
    async function loadInitialData() {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }
        
        const [meRes, recipientsRes] = await Promise.all([
          axios.get('/api/me', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/patients', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (meRes.data) {
          setPayerName(meRes.data.name || '');
          setPayerCpf(meRes.data.cpf || '');
        }
        const patients = recipientsRes.data || [];
        setRecipients(patients);
        if (patients.length > 0) {
          const firstPatient = patients[0];
          setSelectedRecipientId(String(firstPatient.id));
          setReceiverName(firstPatient.full_name);
          setReceiverCpf(firstPatient.cpf);
        }
      } catch (err) {
        logger.error("Erro ao carregar dados iniciais para nova solicitação", err);
        setError("Não foi possível carregar os dados. Tente recarregar a página.");
        if (err.response?.status === 401) navigate('/login');
      }
    }
    loadInitialData();
  }, [navigate]);

  // Funções de Utilidade
  const formatCurrency = (value) => value ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
  
  // Navegação e Submissão
  function handleGoToReview(e) {
    e.preventDefault();
    setError('');
    if (!selectedRecipientId || !amount) {
      setError('Por favor, selecione um paciente e informe um valor.');
      return;
    }
    setStep('review');
  }

  async function handleConfirmAndPay() {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const recipientData = recipients.find(r => r.id === parseInt(selectedRecipientId));
      
      const payload = {
        payerName: payerName,
        payerCpf: payerCpf,
        receiverName: recipientData.full_name,
        receiverCpf: recipientData.cpf || '',
        amount: parseFloat(amount),
        paymentMethod: 'PIX',
        description,
      };

      const res = await axios.post('/api/requests', payload, { headers: { Authorization: `Bearer ${token}` } });
      
      if (res.data.pixData) {
        setPixData(res.data.pixData);
        setCurrentRequestId(res.data.requestId);
        setStep('pix');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      logger.error('Erro ao criar solicitação de crédito:', err);
      setError('Não foi possível processar sua solicitação. Tente novamente.');
      if (err.response?.status === 401) navigate('/login');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReceiptUpload() {
    if (!receiptFile) return;
    setUploading(true);
    setUploadMessage('');
    try {
        const token = localStorage.getItem('token');
        const reader = new FileReader();
        reader.readAsDataURL(receiptFile);
        reader.onload = async (e) => {
            try {
                const base64Data = e.target.result;
                await axios.post('/api/upload-receipt', {
                    requestId: currentRequestId,
                    receiptData: base64Data,
                    receiptType: receiptFile.type,
                }, { headers: { Authorization: `Bearer ${token}` } });
                setUploadMessage('✅ Comprovante enviado com sucesso!');
            } catch (err) {
                logger.error('Erro ao enviar comprovante', err);
                setUploadMessage('❌ Falha no envio. Tente novamente.');
            } finally {
                setUploading(false);
            }
        };
    } catch (err) {
        logger.error('Erro ao ler arquivo de comprovante', err);
        setUploadMessage('❌ Erro ao processar o arquivo.');
        setUploading(false);
    }
  }

  // Sub-componentes de Renderização
  const renderForm = () => (
    <div className="new-request__form-section">
      <div className="new-request__form-card">
        <h2 className="new-request__form-title">Dados do Paciente</h2>
        <form onSubmit={handleGoToReview} className="new-request__form">
          <div className="form-group">
            <label htmlFor="recipient" className="form-label">Pacientes (vinculados a você) *</label>
            <select 
              id="recipient"
              className="form-input"
              value={selectedRecipientId} 
              onChange={e => {
                const id = e.target.value;
                setSelectedRecipientId(id);
                const r = recipients.find(x => String(x.id) === String(id));
                if (r) {
                  setReceiverName(r.full_name);
                  setReceiverCpf(r.cpf);
                }
              }} 
              required
            >
              <option value="">-- Selecione um paciente --</option>
              {recipients.map(r => (
                <option key={r.id} value={r.id}>
                  {r.full_name} {r.cpf ? `— ${r.cpf}` : ''}
                </option>
              ))}
            </select>
          </div>
          
          <h3 className="new-request__section-title">Dados do Pagamento (PIX)</h3>
          
          <div className="form-group">
            <label htmlFor="amount" className="form-label">Valor (R$) *</label>
            <input 
              id="amount"
              type="number" 
              step="0.01" 
              min="0.01" 
              className="form-input"
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              placeholder="0,00"
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="description" className="form-label">Observação do PIX</label>
            <input 
              id="description"
              type="text" 
              className="form-input"
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="Ex.: Compra de Mercearia" 
            />
          </div>
          
          <div className="new-request__form-actions">
            <button type="submit" className="btn btn--primary" disabled={isLoading}>
              {isLoading ? 'Aguarde...' : 'Revisar Compra'}
            </button>
          </div>
          
          {error && (
            <div className="alert alert--error">
              <div className="alert__icon">❌</div>
              <div className="alert__content">{error}</div>
            </div>
          )}
        </form>
      </div>
    </div>
  );

  const renderReview = () => {
    const recipientData = recipients.find(r => String(r.id) === String(selectedRecipientId));
    return (
      <div className="new-request__review-section">
        <div className="new-request__review-card">
          <h2 className="new-request__review-title">Revise sua Compra</h2>
          
          <div className="new-request__review-details">
            <div className="new-request__detail-item">
              <span className="new-request__detail-label">Paciente:</span>
              <span className="new-request__detail-value">{recipientData?.full_name}</span>
            </div>
            
            {recipientData?.cpf && (
              <div className="new-request__detail-item">
                <span className="new-request__detail-label">CPF:</span>
                <span className="new-request__detail-value">{recipientData.cpf}</span>
              </div>
            )}
            
            <div className="new-request__detail-item new-request__detail-item--highlight">
              <span className="new-request__detail-label">Valor:</span>
              <span className="new-request__detail-value">{formatCurrency(parseFloat(amount))}</span>
            </div>
            
            {description && (
              <div className="new-request__detail-item">
                <span className="new-request__detail-label">Observação:</span>
                <span className="new-request__detail-value">{description}</span>
              </div>
            )}
          </div>
          
          <div className="new-request__review-actions">
            <button 
              onClick={() => setStep('form')} 
              className="btn btn--ghost" 
              disabled={isLoading}
            >
              Editar
            </button>
            <button 
              onClick={handleConfirmAndPay} 
              className="btn btn--primary"
              disabled={isLoading}
            >
              {isLoading ? 'Processando...' : 'Confirmar e Gerar PIX'}
            </button>
          </div>
          
          {error && (
            <div className="alert alert--error" style={{marginTop: '1rem'}}>
              <div className="alert__icon">❌</div>
              <div className="alert__content">{error}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPixPayment = () => (
    <div className="new-request__pix-section">
      <div className="new-request__pix-card">
        <h2 className="new-request__pix-title">💰 PIX Gerado com Sucesso!</h2>
        <p className="new-request__pix-subtitle">Escaneie o QR Code ou copie o código para realizar o pagamento</p>
        
        <div className="new-request__pix-info">
          <div className="new-request__pix-summary">
            <span className="new-request__pix-amount">{formatCurrency(pixData.amount)}</span>
            <span className="new-request__pix-receiver">para {receiverName}</span>
          </div>
        </div>
        
        <div className="new-request__qrcode-container">
          <img 
            src={pixData?.qrCodeDataURL || pixData?.qrCodeUrl} 
            alt="QR Code PIX" 
            className="new-request__qrcode" 
          />
        </div>
        
        <div className="new-request__pix-code-section">
          <div className="new-request__pix-code-header">
            <div className="new-request__pix-code-label">
              <span className="new-request__pix-code-icon">📋</span>
              Código PIX
            </div>
            <div className="new-request__pix-code-hint">
              Clique para copiar
            </div>
          </div>
          
          <div 
            className="new-request__pix-code-container"
            onClick={() => {
              navigator.clipboard.writeText(pixData.pixCode).then(() => {
                // Mostrar feedback visual de cópia
                const container = document.querySelector('.new-request__pix-code-container');
                const hint = document.querySelector('.new-request__pix-code-hint');
                
                container.classList.add('new-request__pix-code-container--copied');
                hint.textContent = '✅ Copiado com sucesso!';
                hint.style.color = 'var(--color-success)';
                
                setTimeout(() => {
                  container.classList.remove('new-request__pix-code-container--copied');
                  hint.textContent = 'Clique para copiar';
                  hint.style.color = '';
                }, 3000);
              }).catch(() => {
                // Fallback se clipboard não funcionar
                const textarea = document.createElement('textarea');
                textarea.value = pixData.pixCode;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                
                const container = document.querySelector('.new-request__pix-code-container');
                const hint = document.querySelector('.new-request__pix-code-hint');
                
                container.classList.add('new-request__pix-code-container--copied');
                hint.textContent = '✅ Copiado!';
                hint.style.color = 'var(--color-success)';
                
                setTimeout(() => {
                  container.classList.remove('new-request__pix-code-container--copied');
                  hint.textContent = 'Clique para copiar';
                  hint.style.color = '';
                }, 2000);
              });
            }}
          >
            <div className="new-request__pix-code-text">
              {pixData.pixCode}
            </div>
            <div className="new-request__pix-code-copy-icon">
              📋
            </div>
          </div>
        </div>
        
        <div className="alert alert--info" style={{marginTop: '2rem'}}>
          <div className="alert__icon">ℹ️</div>
          <div className="alert__content">
            <p><strong>Próximo Passo:</strong></p>
            <p>O envio do comprovante e a opção de regenerar este PIX estão disponíveis nos detalhes da sua solicitação.</p>
          </div>
        </div>

        <div className="new-request__navigation-actions">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="btn btn--ghost"
          >
            Ver Minhas Solicitações
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="new-request">
        <div className="new-request__container">
          {step !== 'pix' && (
            <>
              <div className="new-request__header">
                <h1 className="new-request__title">Comprar Crédito</h1>
                <p className="new-request__subtitle">Crie uma nova solicitação de crédito PIX</p>
              </div>
              
              <div className="alert alert--warning">
                <div className="alert__icon">⚠️</div>
                <div className="alert__content">
                  <p><strong>Atenção:</strong> A compra de créditos para cigarros deve ser realizada em uma transação separada.</p>
                </div>
              </div>
            </>
          )}
          
          {step === 'form' && renderForm()}
          {step === 'review' && renderReview()}
          {step === 'pix' && renderPixPayment()}
        </div>
      </div>
    </Layout>
  );
}
