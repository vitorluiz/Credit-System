/**
 * PIX Controller (ES Modules)
 * 
 * Controlador responsável por gerenciar endpoints relacionados ao PIX
 */

import PixService from '../services/PixService.js';

class PixController {
  constructor() {
    this.pixService = new PixService({
      staticPixKey: process.env.STATIC_PIX_KEY,
      merchantName: process.env.MERCHANT_NAME || 'SUPERMERCADO FLORAIS',
      merchantCity: process.env.MERCHANT_CITY || 'CUIABA',
    });
  }

  /**
   * Cria um PIX estático
   * POST /api/create-static-pix
   */
  async createStaticPix(req, res) {
    try {
      const { payerEmail, payerName, receiverName, receiverCpf, amount, description } = req.body;
      
      if (!payerEmail || !payerName || !receiverName || !amount) {
        return res.status(400).json({ 
          message: 'Dados incompletos para criar PIX.',
          required: ['payerEmail', 'payerName', 'receiverName', 'amount']
        });
      }

      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ 
          message: 'Valor inválido. Deve ser um número maior que zero.' 
        });
      }

      const pixData = this.pixService.generateStaticPix(
        numericAmount,
        '' // não incluir descrição no BR Code
      );
      
      const qrCodeDataURL = await this.pixService.getQRCodeDataURL(pixData.pixCode);

      return res.json({
        message: 'PIX estático gerado com sucesso!',
        payment: {
          type: 'PIX',
          amount: pixData.amount,
          receiverName,
          receiverCpf,
          pixKey: pixData.pixKey,
          pixCode: pixData.pixCode,
          qrCodeUrl: qrCodeDataURL,
          transactionId: pixData.transactionId,
          description: pixData.description || description,
          instructions: 'Após realizar o pagamento, envie o comprovante para confirmação.'
        },
        provider: 'STATIC_PIX'
      });

    } catch (err) {
      console.error('Error in PixController.createStaticPix:', err);
      return res.status(500).json({ 
        message: 'Erro interno do servidor.',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }

  /**
   * Valida uma chave PIX
   * POST /api/validate-pix-key
   */
  async validatePixKey(req, res) {
    try {
      const { pixKey } = req.body;
      
      if (!pixKey) {
        return res.status(400).json({ 
          message: 'Chave PIX é obrigatória.' 
        });
      }

      const isValid = this.pixService._assertPixKey
        ? (() => { try { this.pixService._assertPixKey(pixKey); return true; } catch { return false; } })()
        : this.pixService.isValidPixKey?.(pixKey) ?? false;
      
      return res.json({
        pixKey,
        isValid,
        message: isValid ? 'Chave PIX válida' : 'Chave PIX inválida'
      });

    } catch (err) {
      console.error('Error in PixController.validatePixKey:', err);
      return res.status(500).json({ 
        message: 'Erro interno do servidor.',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }

  /**
   * Retorna informações da configuração PIX atual
   * GET /api/pix/config
   */
  async getPixConfig(req, res) {
    try {
      return res.json({
        pixKey: this.pixService.staticPixKey,
        merchantName: this.pixService.merchantName,
        merchantCity: this.pixService.merchantCity,
        isConfigured: !!this.pixService.staticPixKey
      });

    } catch (err) {
      console.error('Error in PixController.getPixConfig:', err);
      return res.status(500).json({ 
        message: 'Erro interno do servidor.',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
}

export default PixController;
