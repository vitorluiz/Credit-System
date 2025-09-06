import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout.jsx';

/**
 * PIX Generation component. Simulates PIX code generation for payment.
 * Allows users to generate a PIX payment code with amount and description.
 */
export default function PixGeneration() {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [pixCode, setPixCode] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isGenerated, setIsGenerated] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      alert('Informe um valor válido.');
      return;
    }

    // Simulate PIX code generation
    const simulatedPixCode = generatePixCode(amount, description);
    const simulatedQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(simulatedPixCode)}`;
    
    setPixCode(simulatedPixCode);
    setQrCodeUrl(simulatedQrUrl);
    setIsGenerated(true);
  };

  const generatePixCode = (value, desc) => {
    // Simulated PIX code (not a real PIX implementation)
    const timestamp = Date.now();
    const mockKey = "pix@superfl orais.com.br";
    return `00020126580014BR.GOV.BCB.PIX0136${mockKey}520400005303986540${parseFloat(value).toFixed(2)}5802BR5925Gestao Credito Super Flora6009SAO PAULO62070503${timestamp.toString().slice(-6)}6304`;
  };

  const formatCurrency = (value) => {
    const numValue = parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.'));
    return numValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    const formattedValue = (parseFloat(value) / 100).toFixed(2);
    setAmount(formattedValue);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pixCode);
    alert('Código PIX copiado para a área de transferência!');
  };

  const handleReset = () => {
    setAmount('');
    setDescription('');
    setPixCode('');
    setQrCodeUrl('');
    setIsGenerated(false);
  };

  return (
    <Layout>
      <div>
        <h1>Gerar PIX</h1>
        <p>Gere um código PIX para receber pagamentos.</p>

        {!isGenerated ? (
          <form onSubmit={handleSubmit} style={{ maxWidth: '500px' }}>
            <label htmlFor="amount">Valor (R$)</label>
            <input
              id="amount"
              type="text"
              value={formatCurrency(amount || '0')}
              onChange={handleAmountChange}
              placeholder="R$ 0,00"
              required
            />

            <label htmlFor="description">Descrição (opcional)</label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Pagamento de serviços"
              maxLength="100"
            />

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" style={{ flex: 1 }}>
                Gerar PIX
              </button>
              <button 
                type="button" 
                onClick={() => navigate('/dashboard')}
                style={{ 
                  flex: 1, 
                  backgroundColor: '#95a5a6', 
                  border: 'none',
                  color: 'white',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div style={{ maxWidth: '500px' }}>
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <h2>PIX Gerado com Sucesso!</h2>
              
              <div style={{ margin: '1rem 0' }}>
                <strong>Valor: {formatCurrency(amount)}</strong>
                {description && <div>Descrição: {description}</div>}
              </div>

              <div style={{ margin: '1.5rem 0' }}>
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code PIX" 
                  style={{ maxWidth: '200px', border: '1px solid #ddd', borderRadius: '8px' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="pixcode">Código PIX:</label>
                <textarea
                  id="pixcode"
                  value={pixCode}
                  readOnly
                  style={{ 
                    width: '100%', 
                    height: '80px', 
                    fontSize: '0.8rem',
                    fontFamily: 'monospace',
                    resize: 'none',
                    marginTop: '0.5rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button onClick={copyToClipboard} style={{ flex: 1 }}>
                  Copiar Código
                </button>
                <button 
                  onClick={handleReset}
                  style={{ 
                    flex: 1,
                    backgroundColor: '#3498db',
                    border: 'none',
                    color: 'white',
                    padding: '0.75rem',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Gerar Novo PIX
                </button>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <button 
                  onClick={() => navigate('/dashboard')}
                  style={{ 
                    backgroundColor: '#95a5a6',
                    border: 'none',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Voltar ao Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
