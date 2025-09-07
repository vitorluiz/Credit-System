# Variáveis de ambiente (.env)

Crie um arquivo `.env` na raiz do projeto (ao lado do `docker-compose.yml`) com os valores abaixo. Não versione este arquivo.

## Exemplo de conteúdo:

```bash
# Configurações do Banco de Dados
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=credit_system
PGHOST=db
PGPORT=5432

# JWT Secret para autenticação
JWT_SECRET=change_me_to_something_very_secure

# URL base da aplicação (frontend)
APP_BASE_URL=http://localhost:3000

# Configurações SMTP para envio de emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_app_password
SMTP_FROM="Gestão de Crédito Super. Florais <noreply@superflorais.com>"
SMTP_SECURE=false

# Configurações do PgAdmin
PGADMIN_DEFAULT_EMAIL=admin@local
PGADMIN_DEFAULT_PASSWORD=admin

# PIX Estático - Chave PIX
STATIC_PIX_KEY=Chave_Pix_Aqui
MERCHANT_NAME="NOME DO SEU COMERCIO"
MERCHANT_CITY="CIDADE DO COMERCIO"
```

## Observações importantes:

- **STATIC_PIX_KEY**: Esta é a chave PIX que será usada para receber os pagamentos. Altere para sua chave PIX real.
- **MERCHANT_NAME**: Nome do seu comércio que aparecerá no PIX (máx. 25 caracteres).
- **MERCHANT_CITY**: Cidade do seu comércio que aparecerá no PIX (máx. 15 caracteres).
- **APP_BASE_URL**: URL pública do frontend usada para montar links de ativação e servir assets públicos.
- **SMTP**: Para envio de emails de ativação. Para Gmail, ative App Passwords (2FA) e use smtp.gmail.com.
- **PgAdmin**: Acesse `http://localhost:5050` com as credenciais configuradas para gerenciar o banco.

## Como usar:

1. Copie este exemplo para um arquivo `.env` na raiz do projeto
2. Altere os valores conforme sua configuração
3. Execute `docker compose up -d` para aplicar as mudanças

## Segurança:

- ⚠️ **NUNCA** commite o arquivo `.env` no git
- Use senhas fortes para JWT_SECRET e banco de dados
- Mantenha as credenciais SMTP seguras
