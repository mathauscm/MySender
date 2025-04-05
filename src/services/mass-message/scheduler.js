// src/services/mass-message/scheduler.js
const { logger } = require('../../whatsappClient');
const { scheduledStorage } = require('../../persistentStorage');
const { startBroadcast } = require('./text-message');
const { startMediaBroadcast, startMultiMediaBroadcast } = require('./media-message');
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
 * Agenda um envio em massa com mídia
 * @param {Array} contacts Lista de contatos
 * @param {string|Array} mediaUrl URL ou caminho do arquivo de mídia, ou array de caminhos para múltiplos arquivos
 * @param {string} caption Legenda opcional
 * @param {string} scheduledTime Data/hora para envio no formato ISO 8601
 * @param {number} delay Intervalo entre mensagens
 * @param {boolean} isMultiMedia Indica se está trabalhando com múltiplos arquivos
 * @returns {Promise<Object>} Informações do agendamento
 */
async function scheduleMediaBroadcast(contacts, mediaUrl, caption = '', scheduledTime, delay = 3000, isMultiMedia = false) {
  try {
    // Validar data de agendamento
    const scheduledDate = new Date(scheduledTime);
    if (isNaN(scheduledDate.getTime())) {
      throw new Error('Data de agendamento inválida');
    }

    // Verificar se não é uma data passada (com 1 minuto de tolerância)
    const now = new Date();
    const minValidDate = new Date(now.getTime() - 60000); // 1 minuto atrás
    if (scheduledDate < minValidDate) {
      throw new Error('Não é possível agendar para uma data passada');
    }

    // Gerar ID do agendamento
    const scheduledId = `sched_${Date.now()}`;

    // Calcular quanto tempo falta até a execução
    const delayMillis = scheduledDate.getTime() - now.getTime();

    // Verificar e validar mídias
    if (Array.isArray(mediaUrl)) {
      // Caso de múltiplos arquivos
      for (const path of mediaUrl) {
        try {
          // Verificar se a mídia existe
          const media = MessageMedia.fromFilePath(path);
        } catch (error) {
          throw new Error(`Arquivo de mídia inválido ou inacessível (${path}): ${error.message}`);
        }
      }
    } else {
      // Caso de arquivo único
      try {
        const media = MessageMedia.fromFilePath(mediaUrl);
      } catch (error) {
        throw new Error(`Arquivo de mídia inválido ou inacessível: ${error.message}`);
      }
    }

    // Registrar agendamento
    const scheduled = {
      id: scheduledId,
      timestamp: now.toISOString(),
      scheduledTime: scheduledDate.toISOString(),
      contacts: contacts,
      caption: caption,
      mediaUrl: mediaUrl,
      delay: delay,
      executed: false,
      isMedia: true,
      isMultiMedia: isMultiMedia
    };

    // Salvar no armazenamento
    scheduledStorage.saveScheduled(scheduledId, scheduled);

    // Agendar para execução futura
    setTimeout(async () => {
      try {
        // Executar o broadcast apropriado
        let result;

        if (isMultiMedia) {
          // Caso de múltiplos arquivos
          result = await startMultiMediaBroadcast(contacts, mediaUrl, caption, delay);
        } else {
          // Caso de arquivo único
          result = await startMediaBroadcast(contacts, mediaUrl, caption, delay);
        }

        // Atualizar o agendamento como executado
        scheduledStorage.updateScheduled(scheduledId, {
          executed: true,
          broadcastId: result.broadcastId,
          executedAt: new Date().toISOString()
        });

        logger.info(`Broadcast ${isMultiMedia ? 'de múltiplas mídias' : 'de mídia'} agendado ${scheduledId} executado com sucesso.`);
      } catch (error) {
        logger.error(`Erro ao executar broadcast ${isMultiMedia ? 'de múltiplas mídias' : 'de mídia'} agendado ${scheduledId}:`, error);
      }
    }, delayMillis);

    logger.info(`Broadcast ${isMultiMedia ? 'de múltiplas mídias' : 'de mídia'} agendado com sucesso para ${scheduledDate.toISOString()}`);

    return {
      scheduledId,
      scheduledTime: scheduledDate.toISOString(),
      totalContacts: contacts.length,
      isMedia: true,
      isMultiMedia: isMultiMedia
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