import React, { useState, useEffect } from 'react';
import axios from 'axios';
import logger from '../utils/logger';
import UploadReceipt from './UploadReceipt';

function PixDetails({ pixData }) {
  if (!pixData) return null;
  return (
    <div className="pix-details-modal">
      <h4>Detalhes do PIX</h4>
      <img src={pixData.qrCodeUrl} alt="QR Code PIX" style={{ maxWidth: '150px', margin: 'auto' }} />
      <label>Copia e Cola:</label>
      <textarea readOnly value={pixData.pixCode} rows="3"></textarea>
      <button onClick={() => navigator.clipboard.writeText(pixData.pixCode).then(() => alert('Copiado!'))}>
        Copiar Código
      </button>
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
      
      // Notifica o componente pai sobre a atualização
      if (onStatusUpdate) {
        onStatusUpdate(request.id, newStatus);
      }
      
      // Fecha o modal após 1.5 segundos
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
  
  // Status finais não podem ser editados
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
    <div onClick={handleBackdropClick} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', padding: '2rem', borderRadius: '8px', width: '90%', maxWidth: '600px', position: 'relative' }}>
        <h2 style={{ marginTop: 0 }}>Detalhes da Solicitação</h2>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', border: 'none', background: 'transparent', fontSize: '1.25rem', cursor: 'pointer' }}>×</button>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ flex: '1 1 45%' }}>
            <strong>Pagador</strong>
            <div>{payer_name}</div>
            <div style={{ fontSize: '0.9rem', color: '#555' }}>CPF: {payer_cpf}</div>
          </div>
          <div style={{ flex: '1 1 45%' }}>
            <strong>Recebedor</strong>
            <div>{receiver_name}</div>
            <div style={{ fontSize: '0.9rem', color: '#555' }}>CPF: {receiver_cpf}</div>
          </div>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <strong>Valor</strong>
          <div>{formatCurrency(amount)}</div>
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <strong>Forma de Pagamento</strong>
          <div>{payment_method}</div>
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <strong>Status</strong>
          <div style={{ 
            display: 'inline-block',
            backgroundColor: getStatusColor(status) + '33',
            color: getStatusColor(status),
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '0.9rem',
            marginTop: '4px'
          }}>
            {status}
          </div>
        </div>
        {request.transaction_id && (
          <div style={{ marginTop: '0.5rem' }}>
            <strong>ID da Transação (PIX):</strong>
            <div style={{ fontSize: '0.9rem', color: '#555' }}><code>{request.transaction_id}</code></div>
          </div>
        )}

        {message && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.5rem', 
            backgroundColor: message.includes('Erro') ? '#ffe6e6' : '#e6ffe6',
            color: message.includes('Erro') ? '#c0392b' : '#27ae60',
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}>
            {message}
          </div>
        )}

        {request.payment_method === 'PIX' && request.status === 'Pendente' && !showPix && (
            <button onClick={handleRegeneratePix} disabled={isPixLoading} style={{marginTop: '1rem'}}>
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
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
            <strong style={{ display: 'block', marginBottom: '0.75rem' }}>Alterar Status:</strong>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {statusOptions.map(statusOption => (
                <button
                  key={statusOption}
                  onClick={() => handleStatusUpdate(statusOption)}
                  disabled={updating || statusOption === status}
                  style={{
                    backgroundColor: statusOption === status ? '#bdc3c7' : getStatusColor(statusOption),
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: statusOption === status || updating ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                    opacity: statusOption === status || updating ? 0.6 : 1
                  }}
                >
                  {updating ? 'Atualizando...' : statusOption}
                </button>
              ))}
            </div>
          </div>
        )}

        {isAdmin && isStatusFinal && (
          <div style={{ 
            marginTop: '1.5rem', 
            borderTop: '1px solid #eee', 
            paddingTop: '1rem',
            backgroundColor: '#f8f9fa',
            padding: '1rem',
            borderRadius: '4px',
            color: '#6c757d'
          }}>
            <strong>ℹ️ Status Final:</strong> Este status não pode ser alterado pois a solicitação já foi finalizada.
          </div>
        )}
      </div>
    </div>
  );
}
