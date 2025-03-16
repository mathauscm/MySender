// src/services/mass-message/media-message.js
const { client, logger } = require('../../whatsappClient');
const { MessageMedia } = require('whatsapp-web.js');
const { broadcastStorage } = require('../../persistentStorage');
const { messageQueue, activeBroadcasts } = require('./queue');

/**
 * Inicia um envio em massa com mídia
 * @param {Array} contacts Lista de contatos para enviar
 * @param {string} mediaUrl URL ou caminho do arquivo de mídia
 * @param {string} caption Legenda opcional para a mídia
 * @param {number} delay Atraso entre mensagens (ms)
 * @returns {Promise<Object>} Resultado do envio
 */
async function startMediaBroadcast(contacts, mediaUrl, caption = '', delay = 3000) {
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
}

/**
 * Envia uma mensagem com mídia para um contato
 * @param {string} phone Número de telefone do destinatário
 * @param {string} mediaUrl URL ou caminho do arquivo de mídia
 * @param {string} caption Legenda opcional para a mídia
 * @returns {Promise<boolean>} True se enviado com sucesso
 */
async function sendMediaMessage(phone, mediaUrl, caption) {
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
}

module.exports = {
  startMediaBroadcast,
  sendMediaMessage
};