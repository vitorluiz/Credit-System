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
        receiverCpf: recipientData.cpf,
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
    <form onSubmit={handleGoToReview} className="request-form">
      <h3>Dados do Paciente</h3>
      <label>Pacientes (vinculados a você)</label>
      <select value={selectedRecipientId} onChange={e => {
        const id = e.target.value;
        setSelectedRecipientId(id);
        const r = recipients.find(x => String(x.id) === String(id));
        if (r) {
          setReceiverName(r.full_name);
          setReceiverCpf(r.cpf);
        }
      }} required>
        <option value="">-- Selecione --</option>
        {recipients.map(r => <option key={r.id} value={r.id}>{r.full_name} — {r.cpf}</option>)}
      </select>
      
      <h3>Dados do Pagamento (PIX)</h3>
      <label>Valor (R$) *</label>
      <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
      <label>Observação do Pix</label>
      <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex.: Compra de Mercearia" />
      
      <button type="submit" disabled={isLoading}>{isLoading ? 'Aguarde...' : 'Revisar Compra'}</button>
      {error && <div className="error">{error}</div>}
    </form>
  );

  const renderReview = () => {
    const recipientData = recipients.find(r => r.id === parseInt(selectedRecipientId));
    return (
      <div className="card review-container">
        <h2>Revise sua Compra</h2>
        <div className="review-details">
          <p><strong>Paciente:</strong> {recipientData?.full_name}</p>
          <p><strong>CPF:</strong> {recipientData?.cpf}</p>
          <p><strong>Valor:</strong> {formatCurrency(parseFloat(amount))}</p>
          {description && <p><strong>Observação:</strong> {description}</p>}
        </div>
        <div className="review-actions">
          <button onClick={() => setStep('form')} className="button-secondary" disabled={isLoading}>Editar</button>
          <button onClick={handleConfirmAndPay} disabled={isLoading}>{isLoading ? 'Processando...' : 'Confirmar e Gerar PIX'}</button>
        </div>
        {error && <div className="error" style={{marginTop: '1rem'}}>{error}</div>}
      </div>
    );
  };

  const renderPixPayment = () => (
    <div className="card pix-container">
      <h2>💰 PIX Gerado com Sucesso!</h2>
      <div className="pix-info">
        <strong>Valor: {formatCurrency(pixData.amount)}</strong>
        <div>Para: {receiverName}</div>
      </div>
      <img src={pixData.qrCodeUrl} alt="QR Code PIX" className="pix-qrcode" />
      <label>Código PIX (Copia e Cola):</label>
      <textarea readOnly value={pixData.pixCode}></textarea>
      <button onClick={() => navigator.clipboard.writeText(pixData.pixCode).then(() => alert('Copiado!'))}>Copiar Código</button>
      
      <div className="alert-info" style={{marginTop: '2rem', textAlign: 'left'}}>
          <p><strong>Próximo Passo:</strong></p>
          <p>O envio do comprovante e a opção de regenerar este PIX estão disponíveis nos detalhes da sua solicitação.</p>
      </div>

      <div className="navigation-actions">
          <button onClick={() => navigate('/dashboard')} className="button-secondary">Ver Minhas Solicitações</button>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="new-request-container">
        <h2>Comprar Crédito</h2>
        <div className="alert-info">
          <p><strong>Atenção:</strong> A compra de créditos para cigarros deve ser realizada em uma transação separada.</p>
        </div>
        
        {step === 'form' && renderForm()}
        {step === 'review' && renderReview()}
        {step === 'pix' && renderPixPayment()}
      </div>
    </Layout>
  );
}
