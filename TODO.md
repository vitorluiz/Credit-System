
# Alterações

## Notificações WhatsApp - EvolutionAPI

**PRIORIDADE ALTA** - Implementar sistema de notificações WhatsApp para administradores

### Funcionalidades a implementar:
1. **Notificação automática quando solicitação for criada**
   - Enviar para administrador via WhatsApp
   - Usar EvolutionAPI para envio
   - Incluir dados da solicitação (valor, pagador, paciente)

2. **Serviço de notificação WhatsApp**
   - Criar WhatsAppService.js
   - Integrar com EvolutionAPI
   - Configurar templates de mensagem

3. **Integração com endpoint de criação**
   - Modificar POST /api/requests
   - Adicionar trigger de notificação
   - Buscar dados do administrador

4. **Configuração EvolutionAPI**
   - Configurar Evolution-Api v2 em Docker separado
   - Configurar acesso por domínio registrado
   - Adicionar variáveis de ambiente

### Variáveis necessárias:
```
DOMINIO=dominio-exemplo.com.br
LETSENCRYPT_EMAIL=emailparavalidaroletsencrypt@mail.com
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
ADMIN_WHATSAPP_NUMBER=
```

---

## Outras tarefas pendentes:

3 - A validação/Confirmação da conta será via email e telefone. ( Usaremos a api-evolution para enviar notificações via telefone.)

4 - Criar rotas de envio das mensagens para whatsapp (necessário Api Evolution)

5 - Configurar Evolution-Api v2, em Docker separadamente do Docker compose da aplicação.

configurar acesso pela domino registrado.

DOMINIO=dominio-exemplo.com.br
LETSENCRYPT_EMAIL=emailparavalidaroletsencrypt@mail.com

OBS: já existe o .env, ele está bloqueado para voce alterar. solicite que eu faça a implementação e/ou Adicione no README_ENV.md
as Váriavies não são sugestão, são apenas explicativas.


