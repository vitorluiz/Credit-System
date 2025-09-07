import React, { useState, useEffect } from 'react';
import axios from 'axios';
import logger from '../utils/logger';
import UploadReceipt from './UploadReceipt';

function PixDetails({ pixData }) {
  if (!pixData) return null;
  const qrSrc = pixData.qrCodeDataURL || pixData.qrCodeUrl;
  return (
    <div className="pix-details-modal">
      <h4>Detalhes do PIX</h4>
      {qrSrc ? (
        <img className="qr-image" src={qrSrc} alt="QR Code PIX" />
      ) : (
        <div className="qr-fallback">QR indisponível no momento. Use o Copia e Cola abaixo.</div>
      )}
      <label className="pix-label">Copia e Cola:</label>
      <textarea className="pix-code-textarea" readOnly value={pixData.pixCode} rows="3"></textarea>
      <div className="pix-actions">
        <button className="btn-copy" onClick={() => navigator.clipboard.writeText(pixData.pixCode).then(() => alert('Copiado!'))}>
          Copiar Código
        </button>
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
    <div onClick={handleBackdropClick} className="details-backdrop">
      <div className="details-modal">
        <h2 className="details-title">Detalhes da Solicitação</h2>
        <button onClick={onClose} className="details-close">×</button>
        <div className="details-grid">
          <div>
            <strong>Pagador</strong>
            <div>{payer_name}</div>
            <div className="muted">CPF: {payer_cpf}</div>
          </div>
          <div>
            <strong>Recebedor</strong>
            <div>{receiver_name}</div>
            <div className="muted">CPF: {receiver_cpf}</div>
          </div>
        </div>
        <div className="details-row">
          <strong>Valor</strong>
          <div>{formatCurrency(amount)}</div>
        </div>
        <div className="details-row">
          <strong>Forma de Pagamento</strong>
          <div>{payment_method}</div>
        </div>
        <div className="details-row">
          <strong>Status</strong>
          <div className="status-pill" style={{ backgroundColor: getStatusColor(status) + '33', color: getStatusColor(status) }}>
            {status}
          </div>
        </div>
        {request.transaction_id && (
          <div className="details-row">
            <strong>ID da Transação (PIX):</strong>
            <div className="muted"><code>{request.transaction_id}</code></div>
          </div>
        )}

        {message && (
          <div className={`flash ${message.includes('Erro') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        {request.payment_method === 'PIX' && request.status === 'Pendente' && !showPix && (
            <button onClick={handleRegeneratePix} disabled={isPixLoading} className="btn-primary" style={{marginTop: '1rem'}}>
              {isPixLoading ? 'Carregando PIX...' : 'Visualizar / Gerar PIX'}
            </button>
          )}

          {showPix && <PixDetails pixData={pixData} />}

          {request.payment_method === 'PIX' && request.status === 'Pendente' && (
             <UploadReceipt 
                requestId={request.id} 
                onUploadSuccess={() => {
                  setMessage('Comprovante enviado! O status será atualizado em breve.');
                }}
             />
          )}

        {canEditStatus && (
          <div className="status-actions">
            <strong>Alterar Status:</strong>
            <div className="status-buttons">
              {statusOptions.map(statusOption => (
                <button
                  key={statusOption}
                  onClick={() => handleStatusUpdate(statusOption)}
                  disabled={updating || statusOption === status}
                  className="btn-status"
                  style={{
                    backgroundColor: statusOption === status ? '#bdc3c7' : getStatusColor(statusOption)
                  }}
                >
                  {updating ? 'Atualizando...' : statusOption}
                </button>
              ))}
            </div>
          </div>
        )}

        {isAdmin && isStatusFinal && (
          <div className="final-info">
            <strong>ℹ️ Status Final:</strong> Este status não pode ser alterado pois a solicitação já foi finalizada.
          </div>
        )}
      </div>
    </div>
  );
}
