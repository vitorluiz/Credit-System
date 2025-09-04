import React from 'react';

/**
 * Modal component to display detailed information about a credit
 * request. It overlays the entire screen with a semi‑transparent
 * background. Clicking the close button triggers the onClose
 * callback passed by the parent.
 */
export default function RequestDetailsModal({ request, onClose }) {
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
          <div>{status}</div>
        </div>
      </div>
    </div>
  );
}
