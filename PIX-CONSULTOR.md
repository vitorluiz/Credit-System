Beleza — vasculhei seu arquivo e tem alguns pontos (de lógica e de aderência ao padrão do BR Code/PIX) que explicam “por que está errado” ou por que pode falhar/gerar payload inválido. 

PixService

O que está errado (ou frágil)

regenerateStaticPix nunca usa o txid

Você passa { txid } para _generateBRCode, mas o método _generateBRCode não tem esse parâmetro na assinatura e força txId = '***'. Resultado: qualquer txid fornecido é ignorado e o BR Code sai sempre com ***.

Além disso, o JSDoc de _generateBRCode menciona txId como parâmetro, mas ele não existe na função — documentação divergente do código.

Valor do campo 54 (Amount) com formatação local em regenerateStaticPix

Em generateStaticPix você manda amount.toFixed(2) → correto para EMV/BR Code (54 exige ponto decimal, e sem símbolo de moeda).

Em regenerateStaticPix você usa this.formatCurrency(amount) → isso gera algo como R$ 1.234,56 (vírgula, símbolo), o que quebra o BR Code (campo 54). O valor precisa ser 1234.56.

Ausência do campo “Point of Initiation Method” (ID 01)

Para QR estático, recomenda-se incluir 01=11. Para dinâmico, 01=12. Seu payload não inclui 01, o que pode causar rejeição em leitores mais estritos.

Comprimento TLV genérico e risco >99

_formatField sempre formata o comprimento com 2 dígitos. Se algum sub-bloco (por ex. o Template 26 inteiro) ultrapassar 99 chars, o TLV fica inválido. Você já limita merchantName (25) e merchantCity (15) e a description (140), então é raro, mas o Template 26 pode estourar dependendo do tamanho da chave + descrição. Falta uma validação dura para garantir que nenhum bloco passe de 99.

generateStaticPix não valida amount

Se amount chegar como string ou NaN, toFixed(2) vai explodir ou gerar lixo. Falta um Number(amount) + checagem de finitude/valor > 0.

Segurança/privacidade do QR

_generateQRCodeUrl usa um serviço público (api.qrserver.com) e vaza o payload do BR Code para terceiros. Tecnicamente funciona, mas é risco de exposição (dados sensíveis como descrição/identificador podem aparecer). Ideal: gerar o QR localmente (ex.: qrcode lib) ou no front.

Inconsistências de retorno

regenerateStaticPix retorna amount “como veio” (pode ser número), enquanto o pixCode foi gerado (errado) com formatCurrency. Também não retorna a description, ao contrário de generateStaticPix que retorna description.

Validação de chave PIX só “superficial”

Aceita telefone +55 com 10 ou 11 dígitos depois do DDD. As chaves PIX pedem E.164 válido (geralmente 11 dígitos nacionais para celular). Não é “erro” fatal, mas pode passar chaves inválidas.

Como corrigir (patch rápido)

A) Passe e use txid corretamente + amount sempre em formato BR Code

Ajuste a assinatura de _generateBRCode para aceitar txid e não fixar *** quando txid for fornecido:

```js
// Substitua a assinatura e uso:
_generateBRCode({ pixKey, amount, description, txid = '***' }) {
  const payloadFormatIndicator = this._formatField('00', '01');

  const merchantAccountInformation = this._formatField('26', [
    this._formatField('00', 'br.gov.bcb.pix'),
    this._formatField('01', pixKey),
    ...(description ? [this._formatField('02', this._normalizeText(description, 140))] : []),
  ].join(''));

  // Campo 01 = Point of Initiation Method (11 = estático)
  const poiMethod = this._formatField('01', '11');

  const merchantCategoryCode = this._formatField('52', '0000');
  const transactionCurrency = this._formatField('53', '986');

  // amount deve estar no formato 1234.56 (ponto, sem "R$")
  const normalizedAmount = this._normalizeAmount(amount);
  const transactionAmount = normalizedAmount ? this._formatField('54', normalizedAmount) : '';

  const countryCode = this._formatField('58', 'BR');
  const merchantName = this._formatField('59', this._normalizeText(this.merchantName, 25));
  const merchantCity = this._formatField('60', this._normalizeText(this.merchantCity, 15));

  const additionalDataFieldTemplate = this._formatField('62', this._formatField('05', txid));

  const payload = [
    payloadFormatIndicator,
    poiMethod,
    merchantAccountInformation,
    merchantCategoryCode,
    transactionCurrency,
    transactionAmount,
    countryCode,
    merchantName,
    merchantCity,
    additionalDataFieldTemplate,
  ].join('');

  const payloadWithCRC = payload + '6304';
  const crc = this._calculateCRC16(payloadWithCRC);
  return payloadWithCRC + crc;
}

```
E crie um normalizador seguro de valor:

```js
_normalizeAmount(amount) {
  if (amount === undefined || amount === null) return '';
  const num = typeof amount === 'number' ? amount : Number(
    String(amount)
      .replace(/[R$\s]/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
  );
  if (!isFinite(num) || num <= 0) return '';
  return num.toFixed(2); // sempre com ponto
}

```
B) Consertar regenerateStaticPix para usar o txid e não formatCurrency:

```js
regenerateStaticPix({ amount, description, txid }) {
  const pixKey = this.staticPixKey;
  const pixCode = this._generateBRCode({
    pixKey,
    amount,          // deixe bruto; _normalizeAmount cuida
    description,
    txid,            // agora é usado de verdade
  });
  const qrCodeUrl = this._generateQRCodeUrl(pixCode);

  return {
    amount: this._normalizeAmount(amount),
    description,
    pixKey,
    pixCode,
    qrCodeUrl,
    transactionId: txid,
  };
}

```

C) Defensiva no generateStaticPix:

```js
generateStaticPix(amount, description = '') {
  const value = this._normalizeAmount(amount);
  if (!value) throw new Error('Valor inválido para PIX estático.');

  const txId = this._generateTransactionId(); // mesmo que não vá no payload
  const pixCode = this._generateBRCode({
    pixKey: this.staticPixKey,
    amount: value,
    description,
    // txid: '***' // para estático puro; pode deixar sem
  });

  return {
    pixKey: this.staticPixKey,
    pixCode,
    qrCodeUrl: this._generateQRCodeUrl(pixCode),
    transactionId: txId,
    amount: Number(value),
    description
  };
}

```
D) (Opcional/Seguro) gere o QR localmente em vez de usar um serviço externo (ex.: qrcode no Node/Front) para evitar vazar dados do BR Code.

E) (Opcional) adicione validações/erros se qualquer TLV ultrapassar 99 caracteres (ou ao menos monitore o tamanho do Template 26).

perfeito! aqui está um PixService.js reescrito, já com os ajustes essenciais: txid realmente usado, valor no formato EMV (1234.56), inclusão do Point of Initiation Method (01=11) para QR estático, normalização/validações, CRC16 correto, TLV com verificação de comprimento, e geração de QR local (via pacote qrcode, opcional).

```
Como usar o QR local: rode npm i qrcode no seu projeto. Se não quiser depender do pacote, pode comentar o método getQRCodeDataURL.
```

```js
// PixService.js
// Serviço para gerar BR Code (PIX estático) corretamente, com validações e QR local opcional.
// Requisitos opcionais para QR local: npm i qrcode

class PixService {
  /**
   * @param {Object} opts
   * @param {string} opts.merchantName   - Nome do recebedor (máx. 25 chars no TLV 59)
   * @param {string} opts.merchantCity   - Cidade do recebedor (máx. 15 chars no TLV 60)
   * @param {string} opts.staticPixKey   - Chave PIX padrão (email, telefone E.164, EVP/UUID, CPF/CNPJ)
   */
  constructor({ merchantName, merchantCity, staticPixKey }) {
    this.merchantName = merchantName ?? '';
    this.merchantCity = merchantCity ?? '';
    this.staticPixKey = staticPixKey ?? '';

    this._assertBaseConfig();
  }

  /* ===========================
   * API PÚBLICA
   * =========================== */

  /**
   * Gera um BR Code PIX estático com valor e descrição.
   * @param {number|string} amount - Valor (será normalizado para 1234.56). Se vazio/<=0, gera sem campo 54.
   * @param {string} [description=''] - Descrição curta (entra no subcampo 26-02)
   */
  generateStaticPix(amount, description = '') {
    const pixKey = this.staticPixKey;
    const pixCode = this._generateBRCode({
      pixKey,
      amount,
      description,
      // QR estático puro pode ter txid '***' (recomendação do Bacen). Você pode passar um txid se quiser.
      txid: '***',
    });

    return {
      pixKey,
      pixCode,
      // Se você instalar "qrcode", pode obter um dataURL com o QR:
      // qrCodeDataURL: await this.getQRCodeDataURL(pixCode),
      transactionId: this._generateTransactionId(),
      amount: this._normalizeAmount(amount) || undefined,
      description,
    };
  }

  /**
   * Regera o BR Code trocando valor/descrição/txid.
   * @param {Object} p
   * @param {number|string} [p.amount]
   * @param {string} [p.description]
   * @param {string} [p.txid] - Máx. 25 chars (TLV 62-05). Se não vier, usa '***'.
   */
  regenerateStaticPix({ amount, description, txid } = {}) {
    const pixKey = this.staticPixKey;
    const pixCode = this._generateBRCode({
      pixKey,
      amount,
      description,
      txid: txid || '***',
    });

    return {
      pixKey,
      pixCode,
      transactionId: txid || '***',
      amount: this._normalizeAmount(amount) || undefined,
      description,
    };
  }

  /**
   * (Opcional) Gera um DataURL de imagem PNG do QR localmente.
   * Requer "qrcode": npm i qrcode
   * @param {string} brcode
   * @param {number} [size=300] - pixels
   * @returns {Promise<string>} data:image/png;base64,...
   */
  async getQRCodeDataURL(brcode, size = 300) {
    try {
      // Import dinâmico para não quebrar se a lib não estiver instalada
      const { toDataURL } = await import('qrcode');
      return await toDataURL(brcode, {
        width: size,
        margin: 1,
        errorCorrectionLevel: 'M',
      });
    } catch (err) {
      throw new Error(
        'Para gerar QR localmente, instale o pacote "qrcode" (npm i qrcode). Erro: ' +
          (err?.message || String(err))
      );
    }
  }

  /* ===========================
   * Núcleo de geração do BR Code
   * =========================== */

  /**
   * Monta o payload EMV (BR Code) e apende CRC16.
   * @param {Object} p
   * @param {string} p.pixKey
   * @param {number|string} [p.amount]
   * @param {string} [p.description]
   * @param {string} [p.txid] - máx 25 chars
   * @returns {string} BR Code completo
   */
  _generateBRCode({ pixKey, amount, description, txid = '***' }) {
    this._assertPixKey(pixKey);

    const payloadFormatIndicator = this._tlv('00', '01');

    // 01 = Point of Initiation Method (11 = estático; 12 = dinâmico)
    const poiMethod = this._tlv('01', '11');

    // Template 26 - Merchant Account Information
    const mai = this._buildMerchantAccountInformation({
      pixKey,
      description,
    });

    const mcc = this._tlv('52', '0000'); // Merchant Category Code
    const currency = this._tlv('53', '986'); // 986 = BRL

    const normalizedAmount = this._normalizeAmount(amount);
    const amountField = normalizedAmount ? this._tlv('54', normalizedAmount) : '';

    const country = this._tlv('58', 'BR');
    const name = this._tlv('59', this._normalizeText(this.merchantName, 25));
    const city = this._tlv('60', this._normalizeText(this.merchantCity, 15));

    // Template 62 - Additional Data Field (ID "05" = txid)
    const addData = this._buildAdditionalData(txid);

    const payload =
      payloadFormatIndicator +
      poiMethod +
      mai +
      mcc +
      currency +
      amountField +
      country +
      name +
      city +
      addData;

    // 63 = CRC
    const toCRC = payload + '6304';
    const crc = this._crc16(toCRC);

    return toCRC + crc;
  }

  _buildMerchantAccountInformation({ pixKey, description }) {
    // 26-00 = GUI obrigatório
    const gui = this._tlv('00', 'br.gov.bcb.pix');
    // 26-01 = Chave PIX
    const key = this._tlv('01', pixKey);
    const parts = [gui, key];

    // 26-02 = Descrição (opcional, curta)
    const descNorm = this._normalizeText(description || '', 140);
    if (descNorm) {
      parts.push(this._tlv('02', descNorm));
    }

    const joined = parts.join('');
    this._ensureLenLT100(joined, 'Template 26 (Merchant Account Information)');

    return this._tlv('26', joined);
  }

  _buildAdditionalData(txidRaw) {
    let txid = (txidRaw ?? '').toString().trim();
    if (!txid) txid = '***';
    // TLV 62-05 suporta até 25 caracteres
    if (txid.length > 25) txid = txid.slice(0, 25);

    const content = this._tlv('05', txid);
    this._ensureLenLT100(content, 'Template 62 (Additional Data)');

    return this._tlv('62', content);
  }

  /* ===========================
   * Utilidades / validações
   * =========================== */

  _assertBaseConfig() {
    if (!this.merchantName) throw new Error('merchantName é obrigatório.');
    if (!this.merchantCity) throw new Error('merchantCity é obrigatório.');
    if (!this.staticPixKey) throw new Error('staticPixKey é obrigatória.');
  }

  _assertPixKey(pixKey) {
    if (!pixKey) throw new Error('Chave PIX não informada.');
    const ok =
      this._isEmail(pixKey) ||
      this._isPhoneE164BR(pixKey) ||
      this._isEVP(pixKey) ||
      this._isCPF(pixKey) ||
      this._isCNPJ(pixKey);
    if (!ok) {
      throw new Error(
        'Chave PIX parece inválida. Use e-mail, telefone E.164 (+55...), EVP/UUID, CPF ou CNPJ.'
      );
    }
  }

  _isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  _isPhoneE164BR(v) {
    // +55 + DDD (2) + número (8 ou 9) → em geral 13 ou 14 chars no total.
    return /^\+55\d{10,11}$/.test(v);
  }

  _isEVP(v) {
    // UUID v4/v5 (EVP) padrão
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
  }

  _isCPF(v) {
    // Permite só dígitos; checagem simples de 11 dígitos (sem DV real).
    return /^\d{11}$/.test(v);
  }

  _isCNPJ(v) {
    // 14 dígitos (sem DV real).
    return /^\d{14}$/.test(v);
  }

  /**
   * Formata um TLV (ID de 2 chars, LEN de 2 chars, VALUE).
   * Lança erro se o comprimento exceder 99 (especificação EMV usa 2 dígitos).
   */
  _tlv(id, value) {
    const v = value == null ? '' : String(value);
    const len = v.length;
    if (len > 99) {
      throw new Error(
        `Campo ${id} excedeu 99 caracteres (${len}). Ajuste os dados (nome, cidade, descrição, txid, etc).`
      );
    }
    const len2 = len.toString().padStart(2, '0');
    return `${id}${len2}${v}`;
  }

  _ensureLenLT100(str, label) {
    if (str.length > 99) {
      throw new Error(`${label} excedeu 99 caracteres (${str.length}).`);
    }
  }

  /**
   * Normaliza textos para ASCII “seguro”, upper-case, e limita tamanho.
   */
  _normalizeText(text, maxLen) {
    if (!text) return '';
    const ascii = text
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^\x20-\x7E]/g, ''); // remove não-ASCII
    const up = ascii.toUpperCase().trim();
    return maxLen ? up.slice(0, maxLen) : up;
    }

  /**
   * Normaliza o valor para o formato EMV (ponto decimal, sem símbolos).
   * Retorna '' se inválido/<=0 (campo 54 ausente).
   */
  _normalizeAmount(amount) {
    if (amount === undefined || amount === null || amount === '') return '';
    if (typeof amount === 'number') {
      if (!isFinite(amount) || amount <= 0) return '';
      return amount.toFixed(2);
    }
    // string: remove "R$", espaços; troca vírgula por ponto; remove separador de milhar
    const num = Number(
      String(amount)
        .replace(/R\$\s?/gi, '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim()
    );
    if (!isFinite(num) || num <= 0) return '';
    return num.toFixed(2);
  }

  /**
   * Gera um ID interno (não vai no BR Code a menos que você coloque em txid).
   */
  _generateTransactionId() {
    return 'TX-' + Math.random().toString(36).slice(2, 10).toUpperCase();
  }

  /**
   * CRC16/CCITT-FALSE (poly 0x1021, init 0xFFFF), output uppercase hex de 4 chars.
   */
  _crc16(payload) {
    let crc = 0xffff;
    const polynomial = 0x1021;

    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = (crc << 1) ^ polynomial;
        } else {
          crc <<= 1;
        }
        crc &= 0xffff;
      }
    }

    const hex = crc.toString(16).toUpperCase().padStart(4, '0');
    return hex;
  }
}

export default PixService;

/* ===========================
 * EXEMPLO DE USO
 * ===========================

import PixService from './PixService';

const pix = new PixService({
  merchantName: 'MERCADO LUIZ',
  merchantCity: 'CUIABA',
  staticPixKey: 'minha_chave@dominio.com', // ou +5565XXXXXXXXX, ou EVP/UUID, CPF, CNPJ
});

// 1) Geração padrão:
const { pixCode } = pix.generateStaticPix(12.5, 'COCA-COLA 2L');
// -> pixCode = payload EMV com CRC

// 2) Regenerar com novo valor/descrição/txid:
const regen = pix.regenerateStaticPix({
  amount: 'R$ 1.234,56',
  description: 'COMPRA 123',
  txid: 'VENDA-000123', // máx 25
});

// 3) (Opcional) QR local:
const dataURL = await pix.getQRCodeDataURL(pixCode, 320);
// <img src={dataURL} />

*/

```