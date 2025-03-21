// whatsappClient.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const winston = require('winston');
// Importação para o qrcode formatado em imagem
const qr = require('qrcode');

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
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-dev-shm-usage'
    ],
  }
});

// Armazenar referência ao socket.io
let io;

// Inicialização do cliente
client.on('qr', async (qrCode) => {
  // Gera o QR code para autenticação no terminal
  qrcode.generate(qrCode, { small: true });
  logger.info('QR Code gerado! Escaneie-o com o WhatsApp do seu telefone.');
  
  // Gerar QR code como imagem base64 para enviar para o frontend
  try {
    const qrDataURL = await qr.toDataURL(qrCode);
    // Se o io estiver disponível, emita o evento para o frontend
    if (io) {
      io.emit('whatsapp-qr', { qrDataURL });
    }
  } catch (err) {
    logger.error('Erro ao gerar QR code:', err);
  }
});

// Adicionar evento de loading screen
client.on('loading_screen', (percent, message) => {
  logger.info(`WhatsApp loading: ${percent}% - ${message}`);
  if (io) {
    io.emit('whatsapp-loading', { percent, message });
  }
});

client.on('ready', () => {
  logger.info('Bot está conectado e pronto para uso!');
  // Emitir evento de autenticação bem-sucedida
  if (io) {
    io.emit('whatsapp-authenticated');
  }
});

client.on('authenticated', () => {
  logger.info('Autenticado com sucesso!');
  // Emitir evento de autenticação bem-sucedida
  if (io) {
    io.emit('whatsapp-authenticated');
  }
});

client.on('auth_failure', (msg) => {
  logger.error('Falha na autenticação:', msg);
});

client.on('disconnected', (reason) => {
  logger.warn('Cliente desconectado:', reason);
});

// Inicializa o cliente
const initialize = (socketIo) => {
  io = socketIo;
  client.initialize();
  return client;
};

module.exports = {
  client,
  initialize,
  logger
};