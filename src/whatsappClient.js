// whatsappClient.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const winston = require('winston');

// Configuração básica de logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Cliente WhatsApp
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// Inicialização do cliente
client.on('qr', (qr) => {
  // Gera o QR code para autenticação no terminal
  qrcode.generate(qr, { small: true });
  logger.info('QR Code gerado! Escaneie-o com o WhatsApp do seu telefone.');
});

client.on('ready', () => {
  logger.info('Bot está conectado e pronto para uso!');
});

client.on('authenticated', () => {
  logger.info('Autenticado com sucesso!');
});

client.on('auth_failure', (msg) => {
  logger.error('Falha na autenticação:', msg);
});

client.on('disconnected', (reason) => {
  logger.warn('Cliente desconectado:', reason);
});

// Inicializa o cliente
const initialize = () => {
  client.initialize();
  return client;
};

module.exports = {
  client,
  initialize,
  logger
};