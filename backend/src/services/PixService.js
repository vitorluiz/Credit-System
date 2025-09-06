/**
 * PIX Service
 * 
 * Responsável por todas as operações relacionadas ao PIX estático,
 * incluindo geração de códigos BR Code e QR Codes.
 */

class PixService {
  constructor() {
    this.staticPixKey = process.env.STATIC_PIX_KEY || 'pix@supermercadoflorais.com.br';
    this.merchantName = 'Supermercado Florais';
    this.merchantCity = 'SAO PAULO';
  }

  /**
   * Gera um PIX estático com QR Code
   * @param {number} amount - Valor do PIX
   * @param {string} description - Descrição do pagamento
   * @returns {Object} Objeto com pixCode e qrCodeUrl
   */
  generateStaticPix(amount, description = '') {
    const txId = this._generateTransactionId();
    const pixCode = this._generateBRCode(amount, description, txId);
    
    return {
      pixKey: this.staticPixKey,
      pixCode,
      qrCodeUrl: this._generateQRCodeUrl(pixCode),
      transactionId: txId,
      amount: parseFloat(amount),
      description
    };
  }

  /**
   * Regenera os dados de um PIX estático a partir de informações existentes.
   * Não cria um novo ID de transação.
   * @param {object} data
   * @param {number} data.amount - O valor da transação.
   * @param {string} data.description - A descrição para o PIX.
   * @param {string} data.txid - O ID da transação existente.
   * @returns {object} Objeto contendo os dados do PIX regenerado.
   */
  regenerateStaticPix({ amount, description, txid }) {
    const pixKey = this.staticPixKey;
    const pixCode = this._generateBRCode({
      amount: this.formatCurrency(amount),
      description,
      txid,
      pixKey,
    });
    const qrCodeUrl = this._generateQRCodeUrl(pixCode);

    return {
      amount,
      pixKey,
      pixCode,
      qrCodeUrl,
      transactionId: txid,
    };
  }

  /**
   * Gera código BR Code seguindo padrão PIX
   * @private
   * @param {number} amount - Valor
   * @param {string} description - Descrição
   * @param {string} txId - ID da transação
   * @returns {string} Código PIX
   */
  _generateBRCode({ pixKey, amount, txid, description }) {
    const payloadFormatIndicator = this._formatField('00', '01');
    const merchantAccountInformation = this._formatField('26', [
      this._formatField('00', 'br.gov.bcb.pix'),
      this._formatField('01', pixKey),
      ...(description ? [this._formatField('02', description)] : []),
    ].join(''));

    const merchantCategoryCode = this._formatField('52', '0000');
    const transactionCurrency = this._formatField('53', '986');
    const transactionAmount = this._formatField('54', amount); // amount já vem formatado
    const countryCode = this._formatField('58', 'BR');
    const merchantName = this._formatField('59', 'Gestao de Credito Super.');
    const merchantCity = this._formatField('60', 'SAO PAULO');
    const additionalDataFieldTemplate = this._formatField('62', this._formatField('05', txid));

    const payload = [
      payloadFormatIndicator,
      merchantAccountInformation,
      merchantCategoryCode,
      transactionCurrency,
      transactionAmount,
      countryCode,
      merchantName,
      merchantCity,
      additionalDataFieldTemplate,
    ].join('') + '6304';

    const crc = this._calculateCRC16(payload).toString(16).toUpperCase().padStart(4, '0');
    return payload + crc;
  }

  /**
   * Gera URL do QR Code
   * @private
   * @param {string} pixCode - Código PIX
   * @returns {string} URL do QR Code
   */
  _generateQRCodeUrl(pixCode) {
    const encodedPixCode = encodeURIComponent(pixCode);
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedPixCode}`;
  }

  /**
   * Gera ID único para transação
   * @private
   * @returns {string} ID da transação
   */
  _generateTransactionId() {
    return Date.now().toString().slice(-10);
  }

  /**
   * Calcula CRC16 para validação do PIX
   * @private
   * @param {string} data - Dados para calcular CRC
   * @returns {string} CRC16 em hexadecimal
   */
  _calculateCRC16(data) {
    const polynomial = 0x1021;
    let crc = 0xFFFF;
    
    for (let i = 0; i < data.length; i++) {
      crc ^= (data.charCodeAt(i) << 8);
      
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ polynomial;
        } else {
          crc = crc << 1;
        }
        crc &= 0xFFFF;
      }
    }
    
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  /**
   * Valida se uma chave PIX é válida
   * @param {string} pixKey - Chave PIX
   * @returns {boolean} Se é válida
   */
  isValidPixKey(pixKey) {
    if (!pixKey || typeof pixKey !== 'string') return false;
    
    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(pixKey)) return true;
    
    // Telefone (+5511999999999)
    const phoneRegex = /^\+55\d{10,11}$/;
    if (phoneRegex.test(pixKey)) return true;
    
    // CPF/CNPJ (apenas números)
    const docRegex = /^\d{11}$|^\d{14}$/;
    if (docRegex.test(pixKey.replace(/\D/g, ''))) return true;
    
    // Chave aleatória (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(pixKey)) return true;
    
    return false;
  }

  /**
   * Formata valor monetário
   * @param {number} amount - Valor
   * @returns {string} Valor formatado
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  }

  /**
   * Helper para formatar campos TLV
   * @private
   * @param {string} id - ID do campo
   * @param {string} value - Valor do campo
   * @returns {string} Campo TLV formatado
   */
  _formatField(id, value) {
    const len = String(value.length).padStart(2, '0');
    return `${id}${len}${value}`;
  }
}

module.exports = PixService;
