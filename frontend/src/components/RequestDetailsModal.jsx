import React, { useState, useEffect } from 'react';
import axios from 'axios';
import logger from '../utils/logger';
import UploadReceipt from './UploadReceipt';
import './RequestDetailsModal.css';

function PixDetails({ pixData }) {
  if (!pixData) return null;
  const qrSrc = pixData.qrCodeDataURL || pixData.qrCodeUrl;
  return (
    <div className="request-details-modal__pix-section">
      <h4 className="request-details-modal__section-title">Detalhes do PIX</h4>
      
      {qrSrc ? (
        <div className="request-details-modal__qrcode-container">
          <img 
            className="request-details-modal__qrcode" 
            src={qrSrc} 
            alt="QR Code PIX" 
          />
        </div>
      ) : (
        <div className="alert alert--warning">
          <div className="alert__icon">⚠️</div>
          <div className="alert__content">QR Code indisponível no momento. Use o código Copia e Cola abaixo.</div>
        </div>
      )}
      
      <div className="request-details-modal__pix-code-section">
        <div className="request-details-modal__pix-code-header">
          <div className="request-details-modal__pix-code-label">
            <span className="request-details-modal__pix-code-icon">📋</span>
            Código PIX
          </div>
          <div className="request-details-modal__pix-code-hint">
            Clique para copiar
          </div>
        </div>
        
        <div 
          className="request-details-modal__pix-code-container"
          onClick={() => {
            navigator.clipboard.writeText(pixData.pixCode).then(() => {
              const container = document.querySelector('.request-details-modal__pix-code-container');
              const hint = document.querySelector('.request-details-modal__pix-code-hint');
              
              container.classList.add('request-details-modal__pix-code-container--copied');
              hint.textContent = '✅ Copiado com sucesso!';
              hint.style.color = 'var(--color-success)';
              
              setTimeout(() => {
                container.classList.remove('request-details-modal__pix-code-container--copied');
                hint.textContent = 'Clique para copiar';
                hint.style.color = '';
              }, 3000);
            }).catch(() => {
              const textarea = document.createElement('textarea');
              textarea.value = pixData.pixCode;
              document.body.appendChild(textarea);
              textarea.select();
              document.execCommand('copy');
              document.body.removeChild(textarea);
              
              const container = document.querySelector('.request-details-modal__pix-code-container');
              const hint = document.querySelector('.request-details-modal__pix-code-hint');
              
              container.classList.add('request-details-modal__pix-code-container--copied');
              hint.textContent = '✅ Copiado!';
              hint.style.color = 'var(--color-success)';
              
              setTimeout(() => {
                container.classList.remove('request-details-modal__pix-code-container--copied');
                hint.textContent = 'Clique para copiar';
                hint.style.color = '';
              }, 2000);
            });
          }}
        >
          <div className="request-details-modal__pix-code-text">
            {pixData.pixCode}
          </div>
          <div className="request-details-modal__pix-code-copy-icon">
            📋
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal component to display detailed information about a credit
 * request. It overlays the entire screen with a semi‑transparent
 * background. Clicking the close button triggers the onClose
 * callback passed by the parent.
 */
export default function RequestDetailsModal({ request, onClose, onStatusUpdate }) {
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [pixData, setPixData] = useState(null);
  const [showPix, setShowPix] = useState(false);
  const [isPixLoading, setIsPixLoading] = useState(false);
  
  
  if (!request) return null;
  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }
  React.useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const { payer_name, payer_cpf, receiver_name, receiver_cpf, amount, payment_method, status } = request;

  function formatCurrency(value) {
    return parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  const handleStatusUpdate = async (newStatus) => {
    setUpdating(true);
    setMessage('');
    
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/requests/${request.id}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessage(`Status alterado para "${newStatus}" com sucesso!`);
      
      if (onStatusUpdate) {
        onStatusUpdate(request.id, newStatus);
      }
      
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (err) {
      setMessage('Erro ao atualizar status. Tente novamente.');
    } finally {
      setUpdating(false);
    }
  };

  async function handleRegeneratePix() {
    setIsPixLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/requests/${request.id}/pix`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPixData(res.data);
      setShowPix(true);
    } catch (err) {
      logger.error(`Falha ao regenerar PIX para solicitação ${request.id}`, err);
      setMessage('Não foi possível carregar os dados do PIX.');
    } finally {
      setIsPixLoading(false);
    }
  }

  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const statusOptions = ['Pendente', 'Pago', 'Cancelado', 'Estornado'];
  
  const finalStatuses = ['pago', 'cancelado', 'estornado'];
  const isStatusFinal = finalStatuses.includes(status.toLowerCase());
  const canEditStatus = isAdmin && !isStatusFinal;
  
  function getStatusColor(status) {
    const lower = status.toLowerCase();
    if (lower === 'pendente') return '#f1c40f';
    if (lower === 'pago') return '#27ae60';
    if (lower === 'cancelado') return '#e74c3c';
    if (lower === 'estornado') return '#9b59b6';
    return '#7f8c8d';
  }

  return (
    <div onClick={handleBackdropClick} className="request-details-modal">
      <div className="request-details-modal__backdrop">
        <div className="request-details-modal__container">
          <div className="request-details-modal__header">
            <h2 className="request-details-modal__title">Detalhes da Solicitação</h2>
            <button onClick={onClose} className="request-details-modal__close">
              <span className="request-details-modal__close-icon">×</span>
            </button>
          </div>
          
          <div className="request-details-modal__content">
            <div className="request-details-modal__card">
              <div className="request-details-modal__card-content">
                {/* Pagador */}
                <div className="request-details-modal__column">
                  <div className="request-details-modal__column-header">
                    <span className="request-details-modal__card-icon">👤</span>
                    <h3 className="request-details-modal__card-title">Pagador</h3>
                  </div>
                  <div className="request-details-modal__field">
                    <span className="request-details-modal__field-label">Nome</span>
                    <span className="request-details-modal__field-value">{payer_name}</span>
                  </div>
                  <div className="request-details-modal__field">
                    <span className="request-details-modal__field-label">CPF</span>
                    <span className="request-details-modal__field-value">{payer_cpf}</span>
                  </div>
                </div>
                
                {/* Recebedor */}
                <div className="request-details-modal__column">
                  <div className="request-details-modal__column-header">
                    <span className="request-details-modal__card-icon">🎯</span>
                    <h3 className="request-details-modal__card-title">Recebedor</h3>
                  </div>
                  <div className="request-details-modal__field">
                    <span className="request-details-modal__field-label">Nome</span>
                    <span className="request-details-modal__field-value">{receiver_name}</span>
                  </div>
                  <div className="request-details-modal__field">
                    <span className="request-details-modal__field-label">CPF</span>
                    <span className="request-details-modal__field-value">{receiver_cpf}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="request-details-modal__summary">
              <div className="request-details-modal__summary-item">
                <span className="request-details-modal__summary-label">Valor</span>
                <span className="request-details-modal__summary-value">{formatCurrency(amount)}</span>
              </div>
              <div className="request-details-modal__summary-item">
                <span className="request-details-modal__summary-label">Forma de Pagamento</span>
                <span className="request-details-modal__summary-value">{payment_method}</span>
              </div>
              <div className="request-details-modal__summary-item">
                <span className="request-details-modal__summary-label">Status</span>
                <span 
                  className="request-details-modal__status-badge"
                  style={{ 
                    backgroundColor: getStatusColor(status) + '20', 
                    color: getStatusColor(status),
                    borderColor: getStatusColor(status) + '40'
                  }}
                >
                  {status}
                </span>
              </div>
            </div>

            {/* Descrição da Solicitação */}
            {request.description && (
              <div className="request-details-modal__section">
                <h4 className="request-details-modal__section-title">
                  <span className="request-details-modal__card-icon">📝</span>
                  Descrição da Solicitação
                </h4>
                <div className="request-details-modal__description">
                  <p className="request-details-modal__description-text">{request.description}</p>
                </div>
              </div>
            )}
            
            {request.transaction_id && (
              <div className="request-details-modal__transaction-section">
                <span className="request-details-modal__transaction-label">ID da Transação PIX:</span>
                <span className="request-details-modal__transaction-value">{request.transaction_id}</span>
              </div>
            )}

            {message && (
              <div className={`alert ${message.includes('Erro') ? 'alert--error' : 'alert--success'}`}>
                <div className="alert__icon">{message.includes('Erro') ? '❌' : '✅'}</div>
                <div className="alert__content">{message}</div>
              </div>
            )}

            {request.payment_method === 'PIX' && request.status === 'Pendente' && !showPix && (
              <div className="request-details-modal__actions">
                <button 
                  onClick={handleRegeneratePix} 
                  disabled={isPixLoading} 
                  className="btn btn--primary"
                >
                  {isPixLoading ? 'Carregando PIX...' : 'Visualizar / Gerar PIX'}
                </button>
              </div>
            )}

            {showPix && <PixDetails pixData={pixData} />}

            {request.payment_method === 'PIX' && request.status === 'Pendente' && (
              <div className="request-details-modal__section">
                <h4 className="request-details-modal__section-title">Enviar Comprovante</h4>
                <UploadReceipt 
                  requestId={request.id} 
                  onUploadSuccess={() => {
                    setMessage('Comprovante enviado! O status será atualizado em breve.');
                  }}
                />
              </div>
            )}

            {request.receipt_url && (
              <div className="request-details-modal__section">
                <h4 className="request-details-modal__section-title">Comprovante</h4>
                <div className="request-details-modal__receipt">
                  <a 
                    href={request.receipt_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="btn btn--primary"
                  >
                    📄 Visualizar / Baixar
                  </a>
                  <span className="request-details-modal__receipt-type">{request.receipt_type}</span>
                </div>
              </div>
            )}

            {canEditStatus && (
              <div className="request-details-modal__section">
                <h4 className="request-details-modal__section-title">Alterar Status</h4>
                <div className="request-details-modal__status-actions">
                  {statusOptions.map(statusOption => (
                    <button
                      key={statusOption}
                      onClick={() => handleStatusUpdate(statusOption)}
                      disabled={updating || statusOption === status}
                      className="btn btn--ghost request-details-modal__status-btn"
                      style={{
                        backgroundColor: statusOption === status ? 'var(--color-bg-light)' : getStatusColor(statusOption) + '20',
                        color: statusOption === status ? 'var(--color-text-secondary)' : getStatusColor(statusOption),
                        borderColor: getStatusColor(statusOption) + '40'
                      }}
                    >
                      {updating ? 'Atualizando...' : statusOption}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isAdmin && isStatusFinal && (
              <div className="alert alert--info">
                <div className="alert__icon">ℹ️</div>
                <div className="alert__content">
                  <strong>Status Final:</strong> Este status não pode ser alterado pois a solicitação já foi finalizada.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
