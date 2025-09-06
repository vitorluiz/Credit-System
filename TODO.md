
# Alterações
1 - Alterar a logo no aside para 'LogoFloraisMin.png'. ajustar o css.

2 - 

2 - remover a solicitação do telefone na url de fist-access, e solicitar o telefone no cadastro para fazer validação com validação. (o telefone deve ser salvo no seguinte formato DDI+DDD+TELEFONE EX. +5565987654321)

3 - A validação/Confirmação da conta será via email e telefone. ( Usaremos a api-evolution para enviar notificações via telefone.)

4 - Criar rotas de envio das mensagens para whatsapp (necessário Api Evolution)

5 - Configurar Evolution-Api v2, em Docker separadamente do Docker compose da aplicação.

configurar acesso pela domino registrado.

DOMINIO=dominio-exemplo.com.br
LETSENCRYPT_EMAIL=emailparavalidaroletsencrypt@mail.com

OBS: já existe o .env, ele está bloqueado para voce alterar. solicite que eu faça a implementação e/ou Adicione no README_ENV.md
as Váriavies não são sugestão, são apenas explicativas.
