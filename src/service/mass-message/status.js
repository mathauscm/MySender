// src/services/mass-message/status.js
const { broadcastStorage, scheduledStorage } = require('../../persistentStorage');
const { activeBroadcasts } = require('./queue');

/**
 * Obtém status de todos os broadcasts
 * @returns {Array} Lista de broadcasts
 */
function getAllBroadcasts() {
  // Obter do armazenamento persistente
  return broadcastStorage.getAllBroadcasts();
}

/**
 * Obtém status de um broadcast específico
 * @param {string} broadcastId ID do broadcast
 * @returns {Object|null} Status do broadcast ou null se não encontrado
 */
function getBroadcastStatus(broadcastId) {
  // Verificar primeiro em memória (para dados mais atualizados)
  if (activeBroadcasts[broadcastId]) {
    return activeBroadcasts[broadcastId];
  }
  
  // Caso contrário, buscar do armazenamento persistente
  return broadcastStorage.getBroadcast(broadcastId);
}

/**
 * Obtém todos os agendamentos
 * @returns {Array} Lista de agendamentos
 */
function getAllScheduled() {
  return scheduledStorage.getAllScheduled();
}

/**
 * Obtém todos os agendamentos pendentes
 * @returns {Array} Lista de agendamentos pendentes
 */
function getPendingScheduled() {
  return scheduledStorage.getPendingScheduled();
}

module.exports = {
  getAllBroadcasts,
  getBroadcastStatus,
  getAllScheduled,
  getPendingScheduled
};