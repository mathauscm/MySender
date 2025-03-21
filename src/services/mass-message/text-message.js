// src/services/mass-message/text-message.js
const { logger } = require('../../whatsappClient');
const { broadcastStorage } = require('../../persistentStorage');
const { messageQueue, activeBroadcasts } = require('./queue');
const contactService = require('../../contactService');

/**
 * Inicia um envio em massa de mensagens de texto
 * @param {Array} contacts Lista de contatos para enviar
 * @param {string} message Mensagem a ser enviada
 * @param {number} delay Atraso entre mensagens (ms)
 * @returns {Promise<Object>} Resultado do envio
 */
async function startBroadcast(contacts, message, delay = 3000) {
  try {
    logger.info(`Iniciando envio em massa para ${contacts.length} contatos/grupos/etiquetas`);
    
    // Expandir etiquetas para obter contatos associados
    let expandedContacts = [];
    let skippedLabels = 0;
    
    for (const contact of contacts) {
      if (contact.type === 'label') {
        try {
          // Obter contatos da etiqueta
          const labelContacts = await contactService.getContactsFromLabel(contact.id);
          
          if (labelContacts && labelContacts.length > 0) {
            logger.info(`Etiqueta "${contact.name}" expandida para ${labelContacts.length} contatos`);
            expandedContacts = [...expandedContacts, ...labelContacts];
          } else {
            logger.warn(`Nenhum contato obtido da etiqueta ${contact.name}. Esta etiqueta será ignorada.`);
            skippedLabels++;
          }
        } catch (error) {
          logger.error(`Erro ao expandir etiqueta ${contact.name}:`, error);
          skippedLabels++;
        }
      } else {
        // Se não for etiqueta, adicionar diretamente
        expandedContacts.push(contact);
      }
    }
    
    // Verificar se há destinatários após expansão
    if (expandedContacts.length === 0) {
      if (skippedLabels > 0) {
        throw new Error(`Não foi possível obter contatos das etiquetas selecionadas. Esta funcionalidade pode não ser suportada na versão atual.`);
      } else {
        throw new Error('Nenhum destinatário válido para envio');
      }
    }
    
    // Registrar o broadcast com os contatos expandidos
    const broadcastId = Date.now().toString();
    const totalContacts = expandedContacts.length;
    
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
    for (let i = 0; i < expandedContacts.length; i++) {
      const contact = expandedContacts[i];
      
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
}

module.exports = {
  startBroadcast
};