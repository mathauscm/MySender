// contactService.js
const { client, logger } = require('./whatsappClient');

const contactService = {
  /**
   * Aguarda até que o cliente WhatsApp esteja pronto
   * @param {number} timeoutMs Tempo máximo de espera em ms
   * @returns {Promise<boolean>} True se o cliente estiver pronto, false se atingir o timeout
   */
  waitForClientReady: async function (timeoutMs = 30000) {
    if (client.info) {
      return true;
    }

    // Implementação com timeout dinâmico
    let timeoutAmount = 1000; // Inicial: 1 segundo
    const maxTimeout = timeoutMs;
    let totalElapsed = 0;
    
    while (totalElapsed < maxTimeout) {
      if (client.info) {
        logger.info(`Cliente WhatsApp pronto após ${totalElapsed}ms`);
        return true;
      }
      
      // Esperar o período atual antes de verificar novamente
      await new Promise(resolve => setTimeout(resolve, timeoutAmount));
      
      totalElapsed += timeoutAmount;
      
      // Aumentar gradualmente o tempo de espera (até 5 segundos por verificação)
      timeoutAmount = Math.min(timeoutAmount * 1.5, 5000);
      
      logger.debug(`Ainda aguardando WhatsApp ficar pronto: ${totalElapsed}/${maxTimeout}ms`);
    }
    
    logger.warn(`Timeout ao aguardar cliente WhatsApp (${maxTimeout}ms)`);
    return false;
  },

  /**
   * Obtém todos os contatos salvos
   * @returns {Promise<Array>} Lista de contatos
   */
  getAllContacts: async function() {
    try {
      // Verificar se o cliente está pronto
      const isReady = await this.waitForClientReady(15000); // Reduzido para 15 segundos
      if (!isReady) {
        throw new Error('Cliente WhatsApp não está pronto');
      }

      const contacts = await client.getContacts();
      
      // Separar contatos, grupos e etiquetas
      const individualContacts = contacts.filter(contact => 
        !contact.isGroup && 
        contact.name && 
        contact.name.trim() !== '' &&
        contact.id.user.length < 15  // Filtro que já está funcionando
      ).map(contact => ({
        id: contact.id._serialized,
        name: contact.name,
        number: contact.id.user,
        displayPhone: `+${contact.id.user}`,
        type: 'contact'
      }));
      
      // Obter grupos
      const groups = contacts.filter(contact => 
        contact.isGroup && 
        contact.name && 
        contact.name.trim() !== ''
      ).map(group => ({
        id: group.id._serialized,
        name: group.name,
        number: group.id.user,
        displayPhone: 'Grupo',
        type: 'group',
        participantsCount: group.participants?.length || 0
      }));
      
      // Obter etiquetas - se disponíveis via API
      let labels = [];
      try {
        // Tente obter etiquetas se a API suportar
        const whatsappLabels = await client.getLabels();
        if (whatsappLabels && Array.isArray(whatsappLabels)) {
          labels = whatsappLabels.map(label => ({
            id: label.id,
            name: label.name,
            displayPhone: 'Etiqueta',
            type: 'label',
            color: label.hexColor
          }));
        }
      } catch (err) {
        logger.warn('API não suporta etiquetas ou erro ao obtê-las:', err);
        // Silenciosamente ignora se a API não suportar etiquetas
      }
      
      // Combinar todos os tipos
      const allContacts = [...individualContacts, ...groups, ...labels];
      
      logger.info(`Obtidos ${individualContacts.length} contatos, ${groups.length} grupos e ${labels.length} etiquetas`);
      
      return allContacts;
    } catch (error) {
      logger.error('Erro ao obter contatos:', error);
      throw error;
    }
  },

  /**
   * Busca contatos por nome ou número
   * @param {string} query Termo de busca
   * @returns {Promise<Array>} Contatos filtrados
   */
  searchContacts: async function (query) {
    try {
      if (!query || query.trim() === '') {
        return [];
      }

      const contacts = await this.getAllContacts();
      const searchTerm = query.toLowerCase();

      return contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm) ||
        contact.number.includes(searchTerm)
      );
    } catch (error) {
      logger.error('Erro ao buscar contatos:', error);
      throw error;
    }
  }
};

module.exports = contactService;