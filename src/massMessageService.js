// massMessageService.js
const { client, logger } = require('./whatsappClient');
const Queue = require('bull');
const { MessageMedia } = require('whatsapp-web.js');
const { broadcastStorage, scheduledStorage } = require('./persistentStorage');

// Cria uma fila para mensagens do WhatsApp
const messageQueue = new Queue('whatsapp-mass-messages', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  }
});

// Armazenamento temporário em memória para broadcasts ativos
// Ainda útil para atualizações frequentes em tempo real
let activeBroadcasts = {};

const massMessageService = {
  /**
   * Inicia um envio em massa
   * @param {Array} contacts Lista de contatos para enviar
   * @param {string} message Mensagem a ser enviada
   * @param {number} delay Atraso entre mensagens (ms)
   * @returns {Promise<Object>} Resultado do envio
   */
  startBroadcast: async function(contacts, message, delay = 3000) {
    try {
      logger.info(`Iniciando envio em massa para ${contacts.length} contatos`);
      
      const broadcastId = Date.now().toString();
      const totalContacts = contacts.length;
      
      // Registrar o broadcast
      const broadcastInfo = {
        id: broadcastId,
        timestamp: new Date().toISOString(),
        message: message,
        totalContacts: totalContacts,
        status: 'in_progress',
        progress: 0,
        successCount: 0,
        failCount: 0,
        isMedia: false
      };
      
      // Salvar no armazenamento persistente
      broadcastStorage.saveBroadcast(broadcastInfo);
      
      // Manter em memória para atualizações frequentes
      activeBroadcasts[broadcastId] = broadcastInfo;
      
      // Adicionar cada mensagem à fila com delay incremental
      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        
        await messageQueue.add({
          phone: contact.id,
          message: message,
          isMedia: false,
          broadcastId: broadcastId,
          contactIndex: i
        }, {
          attempts: 2,
          backoff: {
            type: 'fixed',
            delay: 10000 // 10 segundos entre tentativas
          },
          delay: i * delay // Delay incremental entre mensagens
        });
      }
      
      logger.info(`Broadcast ${broadcastId} enfileirado com sucesso. Total: ${totalContacts} mensagens.`);
      
      return {
        broadcastId,
        totalContacts,
        estimatedTime: (totalContacts * delay) / 1000 // em segundos
      };
    } catch (error) {
      logger.error('Erro ao iniciar broadcast:', error);
      throw error;
    }
  },
  
  /**
   * Agenda um envio em massa para uma data futura
   * @param {Array} contacts Lista de contatos para enviar
   * @param {string} message Mensagem a ser enviada
   * @param {string|Date} scheduledTime Data/hora para envio
   * @param {number} delay Atraso entre mensagens (ms)
   * @returns {Promise<Object>} Resultado do agendamento
   */
  scheduleBroadcast: async function(contacts, message, scheduledTime, delay = 3000) {
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
          const result = await this.startBroadcast(contacts, message, delay);
          
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
  },
  
  /**
   * Envia uma mensagem com mídia para um contato
   * @param {string} phone Número de telefone do destinatário
   * @param {string} mediaUrl URL ou caminho do arquivo de mídia
   * @param {string} caption Legenda opcional para a mídia
   * @returns {Promise<boolean>} True se enviado com sucesso
   */
  sendMediaMessage: async function(phone, mediaUrl, caption) {
    try {
      // Obter mídia da URL ou caminho local
      const media = MessageMedia.fromFilePath(mediaUrl);
      
      // Enviar
      await client.sendMessage(phone, media, { caption });
      
      return true;
    } catch (error) {
      logger.error(`Erro ao enviar mídia para ${phone}:`, error);
      return false;
    }
  },
  
  /**
   * Inicia um envio em massa com mídia
   * @param {Array} contacts Lista de contatos para enviar
   * @param {string} mediaUrl URL ou caminho do arquivo de mídia
   * @param {string} caption Legenda opcional para a mídia
   * @param {number} delay Atraso entre mensagens (ms)
   * @returns {Promise<Object>} Resultado do envio
   */
  startMediaBroadcast: async function(contacts, mediaUrl, caption = '', delay = 3000) {
    try {
      logger.info(`Iniciando envio em massa de mídia para ${contacts.length} contatos`);
      
      const broadcastId = Date.now().toString();
      const totalContacts = contacts.length;
      
      // Registrar o broadcast
      const broadcastInfo = {
        id: broadcastId,
        timestamp: new Date().toISOString(),
        mediaUrl: mediaUrl,
        caption: caption,
        totalContacts: totalContacts,
        status: 'in_progress',
        progress: 0,
        successCount: 0,
        failCount: 0,
        isMedia: true
      };
      
      // Salvar no armazenamento persistente
      broadcastStorage.saveBroadcast(broadcastInfo);
      
      // Manter em memória para atualizações frequentes
      activeBroadcasts[broadcastId] = broadcastInfo;
      
      // Verificar se a mídia existe e é válida
      try {
        const media = MessageMedia.fromFilePath(mediaUrl);
      } catch (error) {
        throw new Error(`Mídia inválida ou inacessível: ${error.message}`);
      }
      
      // Adicionar cada mensagem à fila com delay incremental
      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        
        await messageQueue.add({
          phone: contact.id,
          mediaUrl: mediaUrl,
          caption: caption,
          isMedia: true,
          broadcastId: broadcastId,
          contactIndex: i
        }, {
          attempts: 2,
          backoff: {
            type: 'fixed',
            delay: 10000 // 10 segundos entre tentativas
          },
          delay: i * delay // Delay incremental entre mensagens
        });
      }
      
      logger.info(`Broadcast de mídia ${broadcastId} enfileirado com sucesso. Total: ${totalContacts} mensagens.`);
      
      return {
        broadcastId,
        totalContacts,
        estimatedTime: (totalContacts * delay) / 1000 // em segundos
      };
    } catch (error) {
      logger.error('Erro ao iniciar broadcast de mídia:', error);
      throw error;
    }
  },
  
  /**
   * Agenda um envio em massa com mídia para uma data futura
   * @param {Array} contacts Lista de contatos para enviar
   * @param {string} mediaUrl URL ou caminho do arquivo de mídia
   * @param {string} caption Legenda opcional para a mídia
   * @param {string|Date} scheduledTime Data/hora para envio
   * @param {number} delay Atraso entre mensagens (ms)
   * @returns {Promise<Object>} Resultado do agendamento
   */
  scheduleMediaBroadcast: async function(contacts, mediaUrl, caption = '', scheduledTime, delay = 3000) {
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
          const result = await this.startMediaBroadcast(contacts, mediaUrl, caption, delay);
          
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
  },
  
  /**
   * Obtém status de todos os broadcasts
   * @returns {Array} Lista de broadcasts
   */
  getAllBroadcasts: function() {
    // Obter do armazenamento persistente
    return broadcastStorage.getAllBroadcasts();
  },
  
  /**
   * Obtém status de um broadcast específico
   * @param {string} broadcastId ID do broadcast
   * @returns {Object|null} Status do broadcast ou null se não encontrado
   */
  getBroadcastStatus: function(broadcastId) {
    // Verificar primeiro em memória (para dados mais atualizados)
    if (activeBroadcasts[broadcastId]) {
      return activeBroadcasts[broadcastId];
    }
    
    // Caso contrário, buscar do armazenamento persistente
    return broadcastStorage.getBroadcast(broadcastId);
  },
  
  /**
   * Obtém todos os agendamentos
   * @returns {Array} Lista de agendamentos
   */
  getAllScheduled: function() {
    return scheduledStorage.getAllScheduled();
  },
  
  /**
   * Obtém todos os agendamentos pendentes
   * @returns {Array} Lista de agendamentos pendentes
   */
  getPendingScheduled: function() {
    return scheduledStorage.getPendingScheduled();
  },
  
  // Inicia o processador de mensagens em fila
  startProcessor: function() {
    messageQueue.process(async (job) => {
      const { phone, message, mediaUrl, caption, isMedia, broadcastId, contactIndex } = job.data;
      
      try {
        // Verificar se o cliente está pronto
        if (!client.info) {
          throw new Error('Cliente WhatsApp não está pronto');
        }
        
        // Enviar a mensagem (texto ou mídia)
        if (isMedia) {
          const media = MessageMedia.fromFilePath(mediaUrl);
          await client.sendMessage(phone, media, { caption });
        } else {
          await client.sendMessage(phone, message);
        }
        
        // Atualizar status do broadcast (tanto em memória quanto persistente)
        const broadcast = activeBroadcasts[broadcastId] || broadcastStorage.getBroadcast(broadcastId);
        
        if (broadcast) {
          const updatedBroadcast = {
            ...broadcast,
            successCount: (broadcast.successCount || 0) + 1,
            progress: Math.round(((contactIndex + 1) / broadcast.totalContacts) * 100)
          };
          
          // Verificar se completou
          if (updatedBroadcast.successCount + (updatedBroadcast.failCount || 0) >= updatedBroadcast.totalContacts) {
            updatedBroadcast.status = 'completed';
          }
          
          // Atualizar em memória
          activeBroadcasts[broadcastId] = updatedBroadcast;
          
          // Atualizar no armazenamento persistente
          broadcastStorage.updateBroadcast(broadcastId, updatedBroadcast);
        }
        
        logger.info(`[Broadcast ${broadcastId}] ${isMedia ? 'Mídia' : 'Mensagem'} enviada para ${phone} (${contactIndex + 1}/${broadcast?.totalContacts || '?'})`);
        return { success: true, phone };
      } catch (error) {
        // Atualizar contagem de falhas
        const broadcast = activeBroadcasts[broadcastId] || broadcastStorage.getBroadcast(broadcastId);
        
        if (broadcast) {
          const updatedBroadcast = {
            ...broadcast,
            failCount: (broadcast.failCount || 0) + 1
          };
          
          // Verificar se completou (com falhas)
          if (updatedBroadcast.successCount + updatedBroadcast.failCount >= updatedBroadcast.totalContacts) {
            updatedBroadcast.status = 'completed_with_errors';
          }
          
          // Atualizar em memória
          activeBroadcasts[broadcastId] = updatedBroadcast;
          
          // Atualizar no armazenamento persistente
          broadcastStorage.updateBroadcast(broadcastId, updatedBroadcast);
        }
        
        logger.error(`[Broadcast ${broadcastId}] Erro ao enviar para ${phone}:`, error);
        throw error;
      }
    });
    
    // Carregar broadcasts ativos do armazenamento
    const broadcasts = broadcastStorage.getAllBroadcasts();
    
    // Filtrar apenas os broadcasts ativos e colocá-los em memória
    broadcasts.forEach(broadcast => {
      if (broadcast.status === 'in_progress') {
        activeBroadcasts[broadcast.id] = broadcast;
      }
    });
    
    // Verifica agendamentos pendentes ao iniciar
    this.checkPendingScheduled();
    
    logger.info('Processador de mensagens em massa iniciado');
  },
  
  /**
   * Verifica e reconfigura agendamentos pendentes
   * Importante para quando o servidor reinicia
   */
  checkPendingScheduled: function() {
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
              result = await this.startMediaBroadcast(
                scheduled.contacts,
                scheduled.mediaUrl,
                scheduled.caption || '',
                scheduled.delay || 3000
              );
            } else {
              result = await this.startBroadcast(
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
};

module.exports = massMessageService;