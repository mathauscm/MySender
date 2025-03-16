// contactService.js
const { client, logger } = require('./whatsappClient');

const contactService = {
  /**
   * Obtém todos os contatos salvos
   * @returns {Promise<Array>} Lista de contatos
   */
  getAllContacts: async function() {
    try {
      const contacts = await client.getContacts();
      // Filtra apenas contatos que não são grupos e que têm nome
      const validContacts = contacts.filter(contact => 
        !contact.isGroup && 
        contact.name && 
        contact.name.trim() !== ''
      );
      
      logger.info(`Obtidos ${validContacts.length} contatos válidos`);
      
      return validContacts.map(contact => ({
        id: contact.id._serialized,
        name: contact.name,
        number: contact.id.user,
        displayPhone: `+${contact.id.user}`
      }));
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
  searchContacts: async function(query) {
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