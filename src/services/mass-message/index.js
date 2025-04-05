// src/services/mass-message/index.js
const { startProcessor } = require('./queue');
const { startBroadcast } = require('./text-message');
const {
  startMediaBroadcast,
  sendMediaMessage,
  startMultiMediaBroadcast,
  sendMultiMediaMessage
} = require('./media-message');
const {
  scheduleBroadcast,
  scheduleMediaBroadcast,
  checkPendingScheduled
} = require('./scheduler');
const {
  getAllBroadcasts,
  getBroadcastStatus,
  getAllScheduled,
  getPendingScheduled
} = require('./status');

/**
 * Inicia os serviços de mensagens em massa
 */
function initialize() {
  // Inicia o processador de mensagens
  startProcessor();

  // Verifica agendamentos pendentes
  checkPendingScheduled();
}

// Precisamos implementar o agendamento de múltiplas mídias
async function scheduleMultiMediaBroadcast(contacts, mediaPaths, caption, scheduledTime, delay) {
  // Reutilizar a função existente com pequenas adaptações
  // Especificamos o tipo para poder reconhecer corretamente no processamento
  return await scheduleMediaBroadcast(contacts, mediaPaths, caption, scheduledTime, delay, true);
}

// Exporta todas as funcionalidades do serviço de mensagens em massa
module.exports = {
  // Inicialização
  initialize,

  // Mensagens de texto
  startBroadcast,

  // Mensagens com mídia
  startMediaBroadcast,
  startMultiMediaBroadcast,
  scheduleMultiMediaBroadcast,
  sendMediaMessage,
  sendMultiMediaMessage,

  // Agendamento
  scheduleBroadcast,
  scheduleMediaBroadcast,

  // Status e consultas
  getAllBroadcasts,
  getBroadcastStatus,
  getAllScheduled,
  getPendingScheduled
};