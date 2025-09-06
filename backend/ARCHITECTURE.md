# Arquitetura do Backend

O backend foi refatorado seguindo padrões de projetos Node.js profissionais, organizando o código em módulos separados para melhor manutenibilidade e escalabilidade.

## 📁 Estrutura de Diretórios

```
backend/
├── src/
│   ├── controllers/        # Controladores das rotas
│   │   └── PixController.js
│   ├── services/           # Lógica de negócio
│   │   └── PixService.js
│   ├── middleware/         # Middlewares customizados
│   │   └── auth.js
│   └── routes/             # Definição das rotas
│       └── pixRoutes.js
├── index.js                # Arquivo principal (legado)
└── package.json
```

## 🏗️ Camadas da Aplicação

### **1. Services (Serviços)**
**Localização:** `src/services/`

Contém a lógica de negócio pura, sem dependências do Express ou HTTP.

**Exemplo - PixService.js:**
- Geração de códigos PIX BR Code
- Validação de chaves PIX
- Cálculo de CRC16
- Formatação de valores

```javascript
const pixService = new PixService();
const pixData = pixService.generateStaticPix(100.00, 'Pagamento teste');
```

### **2. Controllers (Controladores)**
**Localização:** `src/controllers/`

Gerenciam as requisições HTTP, validam dados e chamam os serviços apropriados.

**Exemplo - PixController.js:**
- Validação de entrada
- Tratamento de erros
- Formatação de resposta
- Delegação para serviços

```javascript
async createStaticPix(req, res) {
  // Validação + chamada do service + resposta
}
```

### **3. Routes (Rotas)**
**Localização:** `src/routes/`

Definem endpoints e aplicam middlewares específicos.

**Exemplo - pixRoutes.js:**
```javascript
router.post('/create-static', pixController.createStaticPix);
router.get('/config', pixController.getPixConfig);
```

### **4. Middleware**
**Localização:** `src/middleware/`

Funções que processam requisições antes dos controladores.

**Exemplo - auth.js:**
- Autenticação JWT
- Verificação de admin
- Tratamento de erros de auth

## 🔄 Fluxo de Requisição

```
Cliente → Route → Middleware → Controller → Service → Database/External API
                     ↓
Cliente ← JSON Response ← Controller ← Service ←
```

## 📍 Endpoints PIX Organizados

### **Novos Endpoints (Organizados):**
- `POST /api/pix/create-static` - Criar PIX estático
- `POST /api/pix/validate-key` - Validar chave PIX  
- `GET /api/pix/config` - Configuração PIX atual

### **Endpoints Legados (Compatibilidade):**
- `POST /api/create-static-pix` - Mantido para compatibilidade

## 🎯 Vantagens da Nova Estrutura

### **1. Separação de Responsabilidades**
- **Services:** Lógica pura
- **Controllers:** Interface HTTP
- **Routes:** Configuração de endpoints

### **2. Testabilidade**
- Serviços podem ser testados isoladamente
- Mocks mais fáceis de implementar
- Testes unitários vs integração

### **3. Reutilização**
- Services podem ser usados por múltiplos controllers
- Middleware reutilizável
- Código menos duplicado

### **4. Escalabilidade**
- Fácil adição de novos módulos
- Estrutura clara para novos desenvolvedores
- Padrão consistente

## 🚀 Próximos Passos

### **Módulos a Serem Criados:**
1. **UserService** - Gestão de usuários
2. **AuthService** - Autenticação completa  
3. **CreditRequestService** - Solicitações de crédito
4. **EmailService** - Envio de emails
5. **ReceiptService** - Gestão de comprovantes

### **Melhorias Futuras:**
- Validação com Joi/Yup
- Logger estruturado (Winston)
- Rate limiting
- Cache (Redis)
- Documentação OpenAPI/Swagger

## 🔧 Como Usar

### **Adicionar Nova Funcionalidade:**

1. **Criar Service:**
```javascript
// src/services/NovoService.js
class NovoService {
  metodoDeNegocio() {
    // lógica aqui
  }
}
```

2. **Criar Controller:**
```javascript
// src/controllers/NovoController.js
class NovoController {
  async endpoint(req, res) {
    // validação + service + resposta
  }
}
```

3. **Criar Routes:**
```javascript
// src/routes/novoRoutes.js
router.post('/endpoint', novoController.endpoint);
```

4. **Registrar no index.js:**
```javascript
app.use('/api/novo', novoRoutes);
```

## 📚 Padrões Seguidos

- **Naming:** PascalCase para classes, camelCase para métodos
- **Structure:** Responsabilidades bem definidas
- **Error Handling:** Tratamento centralizado
- **Documentation:** JSDoc para métodos importantes
- **Compatibility:** Endpoints legados mantidos

Esta estrutura segue as melhores práticas da indústria e facilita a manutenção e evolução do sistema! 🎉
