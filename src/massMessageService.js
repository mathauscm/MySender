// massMessageService.js
const { client, logger } = require('./whatsappClient');
const Queue = require('bull');
const { MessageMedia } = require('whatsapp-web.js'); // Adicione esta linha para importar MessageMedia

// Cria uma fila para mensagens do WhatsApp
const messageQueue = new Queue('whatsapp-mass-messages', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  }
});

// Configura manipuladores de eventos da fila
// ... (código existente) ...

const massMessageService = {
  // ... (funções existentes) ...
  
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
      let successCount = 0;
      let failCount = 0;
      
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
      
      // Aqui você poderia salvar o broadcast em um banco de dados
      global.broadcasts = global.broadcasts || {};
      global.broadcasts[broadcastId] = broadcastInfo;
      
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

  // ... (código existente) ...
  
  // Modifique o processador para lidar com mensagens de mídia
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
        
        // Atualizar status do broadcast
        if (global.broadcasts && global.broadcasts[broadcastId]) {
          const broadcast = global.broadcasts[broadcastId];
          broadcast.successCount += 1;
          broadcast.progress = Math.round((contactIndex + 1) / broadcast.totalContacts * 100);
          
          if (broadcast.successCount + broadcast.failCount >= broadcast.totalContacts) {
            broadcast.status = 'completed';
          }
        }
        
        logger.info(`[Broadcast ${broadcastId}] ${isMedia ? 'Mídia' : 'Mensagem'} enviada para ${phone} (${contactIndex + 1}/${global.broadcasts[broadcastId].totalContacts})`);
        return { success: true, phone };
      } catch (error) {
        // Atualizar contagem de falhas
        if (global.broadcasts && global.broadcasts[broadcastId]) {
          global.broadcasts[broadcastId].failCount += 1;
        }
        
        logger.error(`[Broadcast ${broadcastId}] Erro ao enviar para ${phone}:`, error);
        throw error;
      }
    });
    
    logger.info('Processador de mensagens em massa iniciado');
  }
};

module.exports = massMessageService;