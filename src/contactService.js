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
  getAllContacts: async function () {
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
   * Obtém todos os contatos associados a uma etiqueta
   * @param {string} labelId ID da etiqueta
   * @returns {Promise<Array>} Lista de contatos associados à etiqueta
   */
  getContactsFromLabel: async function (labelId) {
    try {
        const isReady = await this.waitForClientReady(15000);
        if (!isReady) {
            throw new Error('Cliente WhatsApp não está pronto');
        }

        // Obter todas as etiquetas disponíveis
        const whatsappLabels = await client.getLabels();
        console.log("Etiquetas disponíveis:", whatsappLabels);

        if (!whatsappLabels || !Array.isArray(whatsappLabels)) {
            throw new Error('API não suporta acesso a etiquetas');
        }

        // Procurar a etiqueta desejada
        const label = whatsappLabels.find(l => l.id === labelId);
        if (!label) {
            throw new Error(`Etiqueta com ID ${labelId} não encontrada`);
        }

        console.log(`Etiqueta encontrada: ${label.name}`);

        // Buscar todos os contatos e filtrar os que possuem essa etiqueta
        const contacts = await client.getContacts();
        const labeledContacts = contacts.filter(contact => 
            contact.labels && contact.labels.includes(labelId)
        );

        console.log(`Contatos encontrados para a etiqueta ${label.name}:`, labeledContacts);

        // Formatar no mesmo padrão do getAllContacts
        const formattedContacts = labeledContacts.map(contact => ({
            id: contact.id._serialized,
            name: contact.name || contact.pushname || contact.id.user,
            number: contact.id.user,
            displayPhone: `+${contact.id.user}`,
            type: 'contact'
        }));

        return formattedContacts;
    } catch (error) {
        logger.error(`Erro ao obter contatos da etiqueta ${labelId}:`, error);
        return [];
    }
},

  /**
   * Método alternativo para obter contatos de uma etiqueta
   * Este método tenta várias abordagens alternativas quando a API padrão falha
   * @param {string} labelId ID da etiqueta
   * @returns {Promise<Array>} Lista de contatos associados à etiqueta
   */
  getContactsFromLabelManually: async function (labelId) {
    try {
      // Registrar informações para depuração
      logger.info(`Usando método alternativo para obter contatos da etiqueta ${labelId}`);

      // Buscar a etiqueta específica para pegar o nome
      const whatsappLabels = await client.getLabels();
      const label = whatsappLabels.find(l => l.id === labelId);
      
      if (!label) {
        logger.error(`Etiqueta com ID ${labelId} não encontrada`);
        return [];
      }

      const labelName = label.name;
      
      // Tente várias abordagens
      let labelContacts = [];
      
      // Abordagem 1: Tentar acessar diretamente a etiqueta via API interna do WhatsApp
      try {
        logger.info(`Tentando abordagem 1 para etiqueta ${labelName}`);
        
        // Tente usar a API interna do WhatsApp para obter contatos da etiqueta
        // Este é um método não documentado e pode não funcionar em todas as versões
        const page = client.pupPage;
        if (page) {
          // Tente executar código diretamente no contexto da página
          const result = await page.evaluate(async (labelId) => {
            try {
              // Isto usa a API interna do WhatsApp Web
              // Observação: Esta abordagem pode falhar se a estrutura interna do WhatsApp mudar
              const labelObj = window.Store.Label.get(labelId);
              if (labelObj) {
                const labelItemsPromise = labelObj.itemCollection.getModelsArray();
                const labelItems = await Promise.resolve(labelItemsPromise);
                
                // Extrair IDs de contato
                return labelItems.map(item => {
                  return {
                    id: item.id._serialized || item.id,
                    type: item.type || 'chat'
                  };
                });
              }
              return [];
            } catch (e) {
              console.error("Erro ao acessar etiqueta:", e);
              return { error: e.toString() };
            }
          }, labelId);
          
          if (result && Array.isArray(result) && result.length > 0) {
            logger.info(`Abordagem 1 encontrou ${result.length} itens na etiqueta ${labelName}`);
            
            // Converter os IDs em objetos de contato completos
            const contacts = await client.getContacts();
            
            labelContacts = result
              .filter(item => item.type === 'chat')
              .map(item => {
                const contact = contacts.find(c => c.id._serialized === item.id);
                if (contact) {
                  return {
                    id: contact.id._serialized,
                    name: contact.name || contact.pushname || contact.id.user,
                    number: contact.id.user,
                    displayPhone: `+${contact.id.user}`,
                    type: 'contact'
                  };
                }
                return null;
              })
              .filter(c => c !== null);
              
            logger.info(`Convertidos ${labelContacts.length} contatos válidos da etiqueta ${labelName}`);
            
            if (labelContacts.length > 0) {
              return labelContacts;
            }
          } else if (result && result.error) {
            logger.error(`Erro na abordagem 1: ${result.error}`);
          }
        }
      } catch (error) {
        logger.error(`Erro na abordagem 1 para etiqueta ${labelName}:`, error);
      }
      
      // Abordagem 2: Tentar usar outro método da API do WhatsApp-web.js
      try {
        logger.info(`Tentando abordagem 2 para etiqueta ${labelName}`);
        
        // Alguns métodos alternativos que podem estar disponíveis em algumas versões
        if (typeof label.getChatIds === 'function') {
          const chatIds = await label.getChatIds();
          logger.info(`Obtidos ${chatIds.length} chat IDs da etiqueta ${labelName}`);
          
          for (const chatId of chatIds) {
            try {
              const chat = await client.getChatById(chatId);
              if (chat && chat.contact) {
                labelContacts.push({
                  id: chat.contact.id._serialized,
                  name: chat.contact.name || chat.contact.pushname || chat.contact.id.user,
                  number: chat.contact.id.user,
                  displayPhone: `+${chat.contact.id.user}`,
                  type: 'contact'
                });
              }
            } catch (e) {
              logger.warn(`Não foi possível obter chat ${chatId}:`, e);
            }
          }
          
          if (labelContacts.length > 0) {
            logger.info(`Abordagem 2 encontrou ${labelContacts.length} contatos na etiqueta ${labelName}`);
            return labelContacts;
          }
        }
      } catch (error) {
        logger.error(`Erro na abordagem 2 para etiqueta ${labelName}:`, error);
      }
      
      // Se chegamos aqui, avise o usuário
      logger.warn(`Não foi possível obter contatos da etiqueta ${labelName}. Esta funcionalidade pode não ser suportada na versão atual.`);
      return [];
    } catch (error) {
      logger.error(`Erro geral ao obter contatos da etiqueta ${labelId}:`, error);
      return [];
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