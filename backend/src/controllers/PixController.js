/**
 * PIX Controller
 * 
 * Controlador responsável por gerenciar endpoints relacionados ao PIX
 */

const PixService = require('../services/PixService');

class PixController {
  constructor() {
    this.pixService = new PixService();
  }

  /**
   * Cria um PIX estático
   * POST /api/create-static-pix
   */
  async createStaticPix(req, res) {
    try {
      const { payerEmail, payerName, receiverName, receiverCpf, amount, description } = req.body;
      
      // Validação de dados obrigatórios
      if (!payerEmail || !payerName || !receiverName || !amount) {
        return res.status(400).json({ 
          message: 'Dados incompletos para criar PIX.',
          required: ['payerEmail', 'payerName', 'receiverName', 'amount']
        });
      }

      // Validação do valor
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ 
          message: 'Valor inválido. Deve ser um número maior que zero.' 
        });
      }

      // Gerar PIX estático
      const pixData = this.pixService.generateStaticPix(
        numericAmount,
        description && String(description).trim().length > 0
          ? String(description).trim().substring(0, 25)
          : `Pagamento para ${receiverName}`
      );
      
      return res.json({
        message: 'PIX estático gerado com sucesso!',
        payment: {
          type: 'PIX',
          amount: pixData.amount,
          receiverName,
          receiverCpf,
          pixKey: pixData.pixKey,
          pixCode: pixData.pixCode,
          qrCodeUrl: pixData.qrCodeUrl,
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

      const isValid = this.pixService.isValidPixKey(pixKey);
      
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
        isConfigured: this.pixService.isValidPixKey(this.pixService.staticPixKey)
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

module.exports = PixController;
