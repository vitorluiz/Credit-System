/**
 * PIX Routes (ES Modules)
 */

import express from 'express';
import PixController from '../controllers/PixController.js';
import { authenticateRequest } from '../middleware/auth.js';

const router = express.Router();
const pixController = new PixController();

// Middleware de autenticação para todas as rotas PIX
router.use(authenticateRequest);

/**
 * @route POST /api/pix/create-static
 * @desc Criar PIX estático
 * @access Private
 */
router.post('/create-static', async (req, res) => {
  await pixController.createStaticPix(req, res);
});

/**
 * @route POST /api/pix/validate-key
 * @desc Validar chave PIX
 * @access Private
 */
router.post('/validate-key', async (req, res) => {
  await pixController.validatePixKey(req, res);
});

/**
 * @route GET /api/pix/config
 * @desc Obter configuração PIX atual
 * @access Private
 */
router.get('/config', async (req, res) => {
  await pixController.getPixConfig(req, res);
});

export default router;
