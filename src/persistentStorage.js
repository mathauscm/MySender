// persistentStorage.js
const fs = require('fs');
const path = require('path');
const { logger } = require('./whatsappClient');

// Criar diretório para armazenamento se não existir
const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const BROADCASTS_FILE = path.join(DATA_DIR, 'broadcasts.json');
const SCHEDULED_FILE = path.join(DATA_DIR, 'scheduled.json');

// Inicializa arquivos se não existirem
function initializeFiles() {
  if (!fs.existsSync(BROADCASTS_FILE)) {
    fs.writeFileSync(BROADCASTS_FILE, JSON.stringify([], null, 2));
  }
  
  if (!fs.existsSync(SCHEDULED_FILE)) {
    fs.writeFileSync(SCHEDULED_FILE, JSON.stringify([], null, 2));
  }
}

// Persistência de broadcasts
const broadcastStorage = {
  /**
   * Salva um novo broadcast no histórico
   * @param {Object} broadcast Dados do broadcast
   * @returns {Object} O broadcast salvo
   */
  saveBroadcast: function(broadcast) {
    try {
      let broadcasts = [];
      
      if (fs.existsSync(BROADCASTS_FILE)) {
        const data = fs.readFileSync(BROADCASTS_FILE, 'utf8');
        broadcasts = JSON.parse(data);
      }
      
      broadcasts.push(broadcast);
      
      // Limitamos a 100 registros para evitar que o arquivo fique muito grande
      if (broadcasts.length > 100) {
        broadcasts = broadcasts.slice(-100);
      }
      
      fs.writeFileSync(BROADCASTS_FILE, JSON.stringify(broadcasts, null, 2));
      return broadcast;
    } catch (error) {
      logger.error('Erro ao salvar broadcast:', error);
      throw error;
    }
  },
  
  /**
   * Atualiza o status de um broadcast
   * @param {string} broadcastId ID do broadcast
   * @param {Object} updatedData Dados atualizados
   * @returns {Object|null} O broadcast atualizado ou null se não encontrado
   */
  updateBroadcast: function(broadcastId, updatedData) {
    try {
      if (!fs.existsSync(BROADCASTS_FILE)) {
        return null;
      }
      
      const data = fs.readFileSync(BROADCASTS_FILE, 'utf8');
      let broadcasts = JSON.parse(data);
      
      const index = broadcasts.findIndex(b => b.id === broadcastId);
      
      if (index === -1) {
        return null;
      }
      
      broadcasts[index] = { ...broadcasts[index], ...updatedData };
      
      fs.writeFileSync(BROADCASTS_FILE, JSON.stringify(broadcasts, null, 2));
      return broadcasts[index];
    } catch (error) {
      logger.error(`Erro ao atualizar broadcast ${broadcastId}:`, error);
      throw error;
    }
  },
  
  /**
   * Obtém todos os broadcasts
   * @returns {Array} Lista de broadcasts
   */
  getAllBroadcasts: function() {
    try {
      if (!fs.existsSync(BROADCASTS_FILE)) {
        return [];
      }
      
      const data = fs.readFileSync(BROADCASTS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      logger.error('Erro ao obter broadcasts:', error);
      return [];
    }
  },
  
  /**
   * Obtém um broadcast específico
   * @param {string} broadcastId ID do broadcast
   * @returns {Object|null} O broadcast ou null se não encontrado
   */
  getBroadcast: function(broadcastId) {
    try {
      if (!fs.existsSync(BROADCASTS_FILE)) {
        return null;
      }
      
      const data = fs.readFileSync(BROADCASTS_FILE, 'utf8');
      const broadcasts = JSON.parse(data);
      
      return broadcasts.find(b => b.id === broadcastId) || null;
    } catch (error) {
      logger.error(`Erro ao obter broadcast ${broadcastId}:`, error);
      return null;
    }
  }
};

// Persistência de agendamentos
const scheduledStorage = {
  /**
   * Salva um novo agendamento
   * @param {Object} scheduled Dados do agendamento
   * @returns {Object} O agendamento salvo
   */
  saveScheduled: function(scheduled) {
    try {
      let scheduledList = [];
      
      if (fs.existsSync(SCHEDULED_FILE)) {
        const data = fs.readFileSync(SCHEDULED_FILE, 'utf8');
        scheduledList = JSON.parse(data);
      }
      
      scheduledList.push(scheduled);
      
      fs.writeFileSync(SCHEDULED_FILE, JSON.stringify(scheduledList, null, 2));
      return scheduled;
    } catch (error) {
      logger.error('Erro ao salvar agendamento:', error);
      throw error;
    }
  },
  
  /**
   * Obtém todos os agendamentos pendentes
   * @returns {Array} Lista de agendamentos pendentes
   */
  getPendingScheduled: function() {
    try {
      if (!fs.existsSync(SCHEDULED_FILE)) {
        return [];
      }
      
      const data = fs.readFileSync(SCHEDULED_FILE, 'utf8');
      const scheduledList = JSON.parse(data);
      
      // Filtrar apenas agendamentos pendentes
      const now = new Date().getTime();
      return scheduledList.filter(s => !s.executed && new Date(s.scheduledTime).getTime() > now);
    } catch (error) {
      logger.error('Erro ao obter agendamentos pendentes:', error);
      return [];
    }
  },
  
  /**
   * Atualiza o status de um agendamento
   * @param {string} scheduledId ID do agendamento
   * @param {Object} updatedData Dados atualizados
   * @returns {Object|null} O agendamento atualizado ou null se não encontrado
   */
  updateScheduled: function(scheduledId, updatedData) {
    try {
      if (!fs.existsSync(SCHEDULED_FILE)) {
        return null;
      }
      
      const data = fs.readFileSync(SCHEDULED_FILE, 'utf8');
      let scheduledList = JSON.parse(data);
      
      const index = scheduledList.findIndex(s => s.id === scheduledId);
      
      if (index === -1) {
        return null;
      }
      
      scheduledList[index] = { ...scheduledList[index], ...updatedData };
      
      fs.writeFileSync(SCHEDULED_FILE, JSON.stringify(scheduledList, null, 2));
      return scheduledList[index];
    } catch (error) {
      logger.error(`Erro ao atualizar agendamento ${scheduledId}:`, error);
      throw error;
    }
  },
  
  /**
   * Obtém todos os agendamentos
   * @returns {Array} Lista de agendamentos
   */
  getAllScheduled: function() {
    try {
      if (!fs.existsSync(SCHEDULED_FILE)) {
        return [];
      }
      
      const data = fs.readFileSync(SCHEDULED_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      logger.error('Erro ao obter agendamentos:', error);
      return [];
    }
  }
};

// Inicializar arquivos
initializeFiles();

module.exports = {
  broadcastStorage,
  scheduledStorage
};