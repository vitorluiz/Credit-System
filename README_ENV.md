# Variáveis de ambiente (.env)

Crie um arquivo `.env` na raiz do projeto (ao lado do `docker-compose.yml`) com os valores abaixo. Não versione este arquivo.

Exemplo de conteúdo:

POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=credit_system
PGHOST=db
PGPORT=5432

JWT_SECRET=change_me
APP_BASE_URL=http://localhost:3000

SMTP_HOST=smtp.seuprovedor.com
SMTP_PORT=587
SMTP_USER=seu_usuario@dominio.com
SMTP_PASS=sua_senha
SMTP_FROM="Gestão de Crédito <no-reply@seu-dominio.com>"
SMTP_SECURE=false

Observações:
- APP_BASE_URL: URL pública do frontend usada para montar o link de ativação enviado por email.
- SMTP_PORT e SMTP_SECURE:
  - 465 + SMTP_SECURE=true para SSL/TLS explícito
  - 587 + SMTP_SECURE=false (STARTTLS será negociado)
- SMTP_FROM: remetente amigável/brand. Se não informado, será usado SMTP_USER.
- Para Gmail, ative App Passwords (2FA) e use smtp.gmail.com.
