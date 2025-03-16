// src/services/mass-message/index.js
const { startProcessor } = require('./queue');
const { startBroadcast } = require('./text-message');
const { startMediaBroadcast, sendMediaMessage } = require('./media-message');
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

// Exporta todas as funcionalidades do serviço de mensagens em massa
module.exports = {
  // Inicialização
  initialize,
  
  // Mensagens de texto
  startBroadcast,
  
  // Mensagens com mídia
  startMediaBroadcast,
  sendMediaMessage,
  
  // Agendamento
  scheduleBroadcast,
  scheduleMediaBroadcast,
  
  // Status e consultas
  getAllBroadcasts,
  getBroadcastStatus,
  getAllScheduled,
  getPendingScheduled
};