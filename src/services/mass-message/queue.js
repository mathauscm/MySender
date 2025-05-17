// src/services/mass-message/queue.js
const Queue = require('bull');
const { client, logger } = require('../../whatsappClient');
const { MessageMedia } = require('whatsapp-web.js');
const { broadcastStorage } = require('../../persistentStorage');

// Armazenamento temporário em memória para broadcasts ativos
let activeBroadcasts = {};

// Cria uma fila para mensagens do WhatsApp
const messageQueue = new Queue('whatsapp-mass-messages', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: 50,
    retryStrategy: function (times) {
      return Math.min(times * 100, 3000);
    }
  }
});

/**
 * Inicia o processador de mensagens em fila
 */
function startProcessor() {
  messageQueue.process(async (job) => {
    const { phone, message, mediaUrl, caption, isMedia, broadcastId, contactIndex, mediaIndex, totalMedias } = job.data;

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
        let updatedBroadcast = { ...broadcast };

        // Verificar se é um broadcast de múltiplos arquivos
        if (totalMedias && mediaIndex !== undefined) {
          // Para múltiplos arquivos, a lógica de progresso é diferente
          // Só incrementar o contador de sucesso quando for o último arquivo de um contato
          if (mediaIndex === totalMedias - 1) {
            updatedBroadcast.successCount = (updatedBroadcast.successCount || 0) + 1;
          }

          // Calcular progresso com base no número total de mensagens (contatos × arquivos)
          const totalItems = broadcast.totalContacts * totalMedias;
          const itemsCompleted = contactIndex * totalMedias + mediaIndex + 1;
          updatedBroadcast.progress = Math.round((itemsCompleted / totalItems) * 100);
        } else {
          // Para mensagens normais (texto ou mídia única)
          updatedBroadcast.successCount = (updatedBroadcast.successCount || 0) + 1;
          updatedBroadcast.progress = Math.round(((contactIndex + 1) / broadcast.totalContacts) * 100);
        }

        // Verificar se completou
        if (updatedBroadcast.successCount + (updatedBroadcast.failCount || 0) >= updatedBroadcast.totalContacts) {
          updatedBroadcast.status = 'completed';
        }

        // Atualizar em memória
        activeBroadcasts[broadcastId] = updatedBroadcast;

        // Atualizar no armazenamento persistente
        broadcastStorage.updateBroadcast(broadcastId, updatedBroadcast);
      }

      // Gerar mensagens de log apropriadas dependendo se é múltipla mídia ou não
      if (totalMedias) {
        logger.info(`[Broadcast ${broadcastId}] Mídia ${mediaIndex + 1}/${totalMedias} enviada para ${phone} (contato ${contactIndex + 1}/${broadcast?.totalContacts || '?'})`);
      } else {
        logger.info(`[Broadcast ${broadcastId}] ${isMedia ? 'Mídia' : 'Mensagem'} enviada para ${phone} (${contactIndex + 1}/${broadcast?.totalContacts || '?'})`);
      }

      return { success: true, phone };
    } catch (error) {
      logger.error(`Erro ao processar mensagem para ${phone}:`, error);

      // Atualizar contador de falhas no broadcast
      const broadcast = activeBroadcasts[broadcastId] || broadcastStorage.getBroadcast(broadcastId);

      if (broadcast) {
        const updatedBroadcast = {
          ...broadcast,
          failCount: (broadcast.failCount || 0) + 1
        };

        // Verificar se completou (com falhas)
        if (updatedBroadcast.successCount + updatedBroadcast.failCount >= updatedBroadcast.totalContacts) {
          updatedBroadcast.status = 'completed';
        }

        // Atualizar em memória
        activeBroadcasts[broadcastId] = updatedBroadcast;

        // Atualizar no armazenamento persistente
        broadcastStorage.updateBroadcast(broadcastId, updatedBroadcast);
      }

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

  logger.info('Processador de mensagens em massa iniciado');
}

module.exports = {
  messageQueue,
  activeBroadcasts,
  startProcessor
};