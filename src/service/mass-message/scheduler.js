// src/services/mass-message/scheduler.js
const { logger } = require('../../whatsappClient');
const { scheduledStorage } = require('../../persistentStorage');
const { startBroadcast } = require('./text-message');
const { startMediaBroadcast } = require('./media-message');
const { MessageMedia } = require('whatsapp-web.js');

/**
 * Agenda um envio em massa para uma data futura
 * @param {Array} contacts Lista de contatos para enviar
 * @param {string} message Mensagem a ser enviada
 * @param {string|Date} scheduledTime Data/hora para envio
 * @param {number} delay Atraso entre mensagens (ms)
 * @returns {Promise<Object>} Resultado do agendamento
 */
async function scheduleBroadcast(contacts, message, scheduledTime, delay = 3000) {
  try {
    const now = new Date();
    const scheduledDate = new Date(scheduledTime);
    
    if (scheduledDate <= now) {
      throw new Error('A data de agendamento deve ser no futuro');
    }
    
    const delayMillis = scheduledDate.getTime() - now.getTime();
    const scheduledId = `scheduled_${Date.now()}`;
    
    // Registrar o agendamento
    const scheduledInfo = {
      id: scheduledId,
      createdAt: now.toISOString(),
      scheduledTime: scheduledDate.toISOString(),
      message: message,
      contacts: contacts,
      totalContacts: contacts.length,
      delay: delay,
      executed: false,
      broadcastId: null
    };
    
    // Salvar no armazenamento persistente
    scheduledStorage.saveScheduled(scheduledInfo);
    
    // Agendar para execução futura
    setTimeout(async () => {
      try {
        // Executar o broadcast
        const result = await startBroadcast(contacts, message, delay);
        
        // Atualizar o agendamento como executado
        scheduledStorage.updateScheduled(scheduledId, {
          executed: true,
          broadcastId: result.broadcastId,
          executedAt: new Date().toISOString()
        });
        
        logger.info(`Broadcast agendado ${scheduledId} executado com sucesso.`);
      } catch (error) {
        logger.error(`Erro ao executar broadcast agendado ${scheduledId}:`, error);
      }
    }, delayMillis);
    
    logger.info(`Broadcast agendado com sucesso para ${scheduledDate.toISOString()}`);
    
    return {
      scheduledId,
      scheduledTime: scheduledDate.toISOString(),
      totalContacts: contacts.length,
      message: message.substring(0, 50) + (message.length > 50 ? '...' : '') // Resumo da mensagem
    };
  } catch (error) {
    logger.error('Erro ao agendar broadcast:', error);
    throw error;
  }
}

/**
 * Agenda um envio em massa com mídia para uma data futura
 * @param {Array} contacts Lista de contatos para enviar
 * @param {string} mediaUrl URL ou caminho do arquivo de mídia
 * @param {string} caption Legenda opcional para a mídia
 * @param {string|Date} scheduledTime Data/hora para envio
 * @param {number} delay Atraso entre mensagens (ms)
 * @returns {Promise<Object>} Resultado do agendamento
 */
async function scheduleMediaBroadcast(contacts, mediaUrl, caption = '', scheduledTime, delay = 3000) {
  try {
    const now = new Date();
    const scheduledDate = new Date(scheduledTime);
    
    if (scheduledDate <= now) {
      throw new Error('A data de agendamento deve ser no futuro');
    }
    
    const delayMillis = scheduledDate.getTime() - now.getTime();
    const scheduledId = `scheduled_media_${Date.now()}`;
    
    // Verificar se a mídia existe e é válida
    try {
      const media = MessageMedia.fromFilePath(mediaUrl);
    } catch (error) {
      throw new Error(`Mídia inválida ou inacessível: ${error.message}`);
    }
    
    // Registrar o agendamento
    const scheduledInfo = {
      id: scheduledId,
      createdAt: now.toISOString(),
      scheduledTime: scheduledDate.toISOString(),
      mediaUrl: mediaUrl,
      caption: caption,
      contacts: contacts,
      totalContacts: contacts.length,
      delay: delay,
      executed: false,
      isMedia: true,
      broadcastId: null
    };
    
    // Salvar no armazenamento persistente
    scheduledStorage.saveScheduled(scheduledInfo);
    
    // Agendar para execução futura
    setTimeout(async () => {
      try {
        // Executar o broadcast
        const result = await startMediaBroadcast(contacts, mediaUrl, caption, delay);
        
        // Atualizar o agendamento como executado
        scheduledStorage.updateScheduled(scheduledId, {
          executed: true,
          broadcastId: result.broadcastId,
          executedAt: new Date().toISOString()
        });
        
        logger.info(`Broadcast de mídia agendado ${scheduledId} executado com sucesso.`);
      } catch (error) {
        logger.error(`Erro ao executar broadcast de mídia agendado ${scheduledId}:`, error);
      }
    }, delayMillis);
    
    logger.info(`Broadcast de mídia agendado com sucesso para ${scheduledDate.toISOString()}`);
    
    return {
      scheduledId,
      scheduledTime: scheduledDate.toISOString(),
      totalContacts: contacts.length,
      isMedia: true
    };
  } catch (error) {
    logger.error('Erro ao agendar broadcast de mídia:', error);
    throw error;
  }
}

/**
 * Verifica e reconfigura agendamentos pendentes
 * Importante para quando o servidor reinicia
 */
function checkPendingScheduled() {
  const pendingScheduled = scheduledStorage.getPendingScheduled();
  
  pendingScheduled.forEach(scheduled => {
    const now = new Date();
    const scheduledDate = new Date(scheduled.scheduledTime);
    
    // Se ainda está no futuro, reagendar
    if (scheduledDate > now) {
      const delayMillis = scheduledDate.getTime() - now.getTime();
      
      setTimeout(async () => {
        try {
          let result;
          
          // Executar o broadcast apropriado
          if (scheduled.isMedia) {
            result = await startMediaBroadcast(
              scheduled.contacts,
              scheduled.mediaUrl,
              scheduled.caption || '',
              scheduled.delay || 3000
            );
          } else {
            result = await startBroadcast(
              scheduled.contacts,
              scheduled.message,
              scheduled.delay || 3000
            );
          }
          
          // Atualizar o agendamento
          scheduledStorage.updateScheduled(scheduled.id, {
            executed: true,
            broadcastId: result.broadcastId,
            executedAt: new Date().toISOString()
          });
          
          logger.info(`Broadcast agendado ${scheduled.id} executado com sucesso após reinicialização.`);
        } catch (error) {
          logger.error(`Erro ao executar broadcast agendado ${scheduled.id} após reinicialização:`, error);
        }
      }, delayMillis);
      
      logger.info(`Reagendado broadcast ${scheduled.id} para ${scheduledDate.toISOString()} após reinicialização.`);
    }
  });
}

module.exports = {
  scheduleBroadcast,
  scheduleMediaBroadcast,
  checkPendingScheduled
};