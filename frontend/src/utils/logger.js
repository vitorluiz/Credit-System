import log from 'loglevel';

// Configura o nível de log padrão.
// Para desenvolvimento, 'debug' ou 'trace' são bons.
// Para produção, 'warn' ou 'error'.
// A VITE_ env var é injetada no build time.
const level = import.meta.env.VITE_LOG_LEVEL || (import.meta.env.DEV ? 'debug' : 'warn');

log.setLevel(level);

// Adiciona um prefixo com timestamp para facilitar a leitura
const originalFactory = log.methodFactory;
log.methodFactory = function (methodName, logLevel, loggerName) {
  const rawMethod = originalFactory(methodName, logLevel, loggerName);
  return function (message, ...args) {
    const timestamp = new Date().toLocaleTimeString();
    rawMethod(`[${timestamp}] ${message}`, ...args);
  };
};

// Aplica a nova factory
log.rebuild();


export default log;
