import React, { useState } from 'react';
import axios from 'axios';
import logger from '../utils/logger';

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
    <div className="upload-section">
      <h3 style={{ marginTop: 0 }}>📄 Enviar Comprovante</h3>
      <p>Anexe o comprovante para agilizar a confirmação.</p>
      <input 
        type="file" 
        accept="image/*,.pdf" 
        onChange={(e) => setReceiptFile(e.target.files[0])} 
      />
      <button 
        onClick={handleReceiptUpload} 
        disabled={!receiptFile || uploading}
      >
        {uploading ? 'Enviando...' : 'Enviar Comprovante'}
      </button>
      {uploadMessage && (
        <div className={uploadMessage.includes('✅') ? 'success' : 'error'}>
          {uploadMessage}
        </div>
      )}
    </div>
  );
}
