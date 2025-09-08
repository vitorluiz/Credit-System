import React, { useState } from 'react';
import axios from 'axios';
import logger from '../utils/logger';
import './UploadReceipt.css';

export default function UploadReceipt({ requestId, onUploadSuccess }) {
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

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
            requestId,
            receiptData: base64Data,
            receiptType: receiptFile.type,
          }, { headers: { Authorization: `Bearer ${token}` } });
          setUploadMessage('✅ Comprovante enviado com sucesso!');
          if (onUploadSuccess) onUploadSuccess();
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

  return (
    <div className="upload-receipt">
      <div className="upload-receipt__header">
        <span className="upload-receipt__icon">📄</span>
        <h3 className="upload-receipt__title">Enviar Comprovante</h3>
      </div>
      <p className="upload-receipt__description">Anexe o comprovante para agilizar a confirmação.</p>
      
      <div className="upload-receipt__form">
        <div className="form-group">
          <label className="form-label">Selecionar Arquivo</label>
          <input 
            type="file" 
            accept="image/*,.pdf" 
            onChange={(e) => setReceiptFile(e.target.files[0])}
            className="form-input upload-receipt__file-input"
            id="receipt-file"
          />
          <label htmlFor="receipt-file" className="upload-receipt__file-label">
            <span className="upload-receipt__file-icon">📎</span>
            <span className="upload-receipt__file-text">
              {receiptFile ? receiptFile.name : 'Clique para selecionar um arquivo'}
            </span>
          </label>
        </div>
        
        <button 
          onClick={handleReceiptUpload} 
          disabled={!receiptFile || uploading}
          className="btn btn--primary upload-receipt__submit"
        >
          <span className="upload-receipt__submit-icon">
            {uploading ? '⏳' : '📤'}
          </span>
          {uploading ? 'Enviando...' : 'Enviar Comprovante'}
        </button>
      </div>
      
      {uploadMessage && (
        <div className={`upload-receipt__message ${uploadMessage.includes('✅') ? 'upload-receipt__message--success' : 'upload-receipt__message--error'}`}>
          <span className="upload-receipt__message-icon">
            {uploadMessage.includes('✅') ? '✅' : '❌'}
          </span>
          {uploadMessage}
        </div>
      )}
    </div>
  );
}
