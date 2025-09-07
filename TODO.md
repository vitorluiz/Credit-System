
# Alterações
1 - Alterar a logo no aside para 'LogoFloraisMin.png'. ajustar o css. - ok

2 - remover a solicitação do telefone na url de fist-access, e solicitar o telefone no cadastro para fazer validação com validação. (o telefone deve ser salvo no seguinte formato DDI+DDD+TELEFONE EX. +5565987654321) ok

2.1 após o refatoramento da mudança do require para import, estamos tendo erros já resolvidos anteriormente. nok
2.2 url http://localhost:3000/new-request, solicitando pacientes mesmo tendo paciente já cadastrado! nok
2.3 ao solicitar compra de credito, pede para cadastrar o paciente isso já estava resolvido! ok
2.4 o QrCode da pagina de pix não está carregando, apenas do detalhe. ok
2.5 geração dos qr e copia e cola pix:
- Gerado na url new-request - ok
```
00020101021126580014br.gov.bcb.pix0136da8ed146-f0de-4f92-a7ba-ae230ca4638152040000530398654045.005802BR591937038086 EMILLY VAZ6014CHAP GUIMARAES62070503***63040AB5
```

- Gerado no modal detalhes - ok
```
00020101021126580014br.gov.bcb.pix0136da8ed146-f0de-4f92-a7ba-ae230ca4638152040000530398654045.005802BR591937038086 EMILLY VAZ6014CHAP GUIMARAES62150511TX-X5IUQ06E6304AAE4
```


3 - A validação/Confirmação da conta será via email e telefone. ( Usaremos a api-evolution para enviar notificações via telefone.)

4 - Criar rotas de envio das mensagens para whatsapp (necessário Api Evolution)

5 - Configurar Evolution-Api v2, em Docker separadamente do Docker compose da aplicação.

configurar acesso pela domino registrado.

DOMINIO=dominio-exemplo.com.br
LETSENCRYPT_EMAIL=emailparavalidaroletsencrypt@mail.com

OBS: já existe o .env, ele está bloqueado para voce alterar. solicite que eu faça a implementação e/ou Adicione no README_ENV.md
as Váriavies não são sugestão, são apenas explicativas.


