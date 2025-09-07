/**
 * Authentication Middleware
 * 
 * Middleware para autenticação de rotas (ES Modules)
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

/**
 * Middleware para autenticar requisições JWT
 * @param {Request} req - Request object
 * @param {Response} res - Response object  
 * @param {Function} next - Next middleware function
 */
export async function authenticateRequest(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'Token de acesso necessário. Faça login primeiro.' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '
    
    if (!token) {
      return res.status(401).json({ 
        message: 'Token inválido.' 
      });
    }

    // Verificar e decodificar o token
    const payload = jwt.verify(token, JWT_SECRET);
    
    // Adicionar payload ao request para uso posterior
    req.user = payload;
    
    next();
    
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Token inválido.' 
      });
    }
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expirado. Faça login novamente.' 
      });
    }
    
    console.error('Error in authenticateRequest middleware:', err);
    return res.status(500).json({ 
      message: 'Erro interno do servidor.' 
    });
  }
}

/**
 * Middleware para verificar se usuário é admin
 * @param {Request} req - Request object
 * @param {Response} res - Response object  
 * @param {Function} next - Next middleware function
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Autenticação necessária.' 
    });
  }

  const isAdmin = req.user.is_admin === true || req.user.is_admin === 'true';
  
  if (!isAdmin) {
    return res.status(403).json({ 
      message: 'Acesso negado. Apenas administradores podem acessar este recurso.' 
    });
  }

  next();
}

/**
 * Função helper para autenticar e retornar payload (compatibilidade)
 * @param {Request} req - Request object
 * @returns {Promise<Object>} JWT payload
 */
export async function authenticateRequestLegacy(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Token de acesso necessário.');
  }

  const token = authHeader.substring(7);
  
  if (!token) {
    throw new Error('Token inválido.');
  }

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      throw new Error('Token inválido.');
    }
    if (err.name === 'TokenExpiredError') {
      throw new Error('Token expirado.');
    }
    throw err;
  }
}
