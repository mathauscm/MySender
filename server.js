// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initialize: initializeWhatsapp, client, logger } = require('./src/whatsappClient');
const contactService = require('./src/contactService');
const massMessageService = require('./src/services/mass-message');

const multer = require('multer');

const app = express();
const port = process.env.PORT || 3030;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para verificar se o cliente WhatsApp está pronto
const ensureClientReady = async (req, res, next) => {
  try {
    const isReady = await contactService.waitForClientReady(10000); // Espera até 10 segundos
    if (!isReady) {
      return res.status(503).json({ 
        error: 'Cliente WhatsApp não está pronto. Aguarde alguns instantes e tente novamente.',
        clientStatus: client.info ? 'ready' : 'initializing'
      });
    }
    next();
  } catch (error) {
    logger.error('Erro ao verificar status do cliente:', error);
    return res.status(500).json({ error: 'Erro interno ao verificar status do cliente' });
  }
};

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 16 * 1024 * 1024 } // Limite de 16MB
});

// Certifique-se de que o diretório de uploads existe
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Inicializa serviços
async function initializeServices() {
  try {
    // Inicializa o cliente WhatsApp
    initializeWhatsapp();
    
    // Inicia o processador de mensagens
    massMessageService.initialize();
    
    logger.info('Serviços inicializados com sucesso!');
  } catch (error) {
    logger.error('Erro ao inicializar serviços:', error);
    process.exit(1);
  }
}

// Rota para verificação de status do servidor e cliente
app.get('/api/status', (req, res) => {
  try {
    const status = {
      server: 'online',
      whatsapp: client.info ? 'ready' : 'initializing'
    };
    res.json(status);
  } catch (error) {
    logger.error('Erro ao obter status:', error);
    res.status(500).json({ error: 'Erro ao obter status' });
  }
});

// Rotas para contatos - usando o middleware de verificação
app.get('/api/contacts', ensureClientReady, async (req, res) => {
  try {
    const contacts = await contactService.getAllContacts();
    res.json(contacts);
  } catch (error) {
    logger.error('Erro ao buscar contatos:', error);
    res.status(500).json({ error: 'Erro ao buscar contatos' });
  }
});

app.get('/api/contacts/search', ensureClientReady, async (req, res) => {
  try {
    const { q } = req.query;
    const contacts = await contactService.searchContacts(q);
    res.json(contacts);
  } catch (error) {
    logger.error('Erro ao buscar contatos:', error);
    res.status(500).json({ error: 'Erro ao buscar contatos' });
  }
});

// Rotas para envio em massa - usando o middleware de verificação
app.post('/api/broadcasts', ensureClientReady, async (req, res) => {
  try {
    const { contacts, message, delay } = req.body;
    
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'Lista de contatos é obrigatória' });
    }
    
    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }
    
    const result = await massMessageService.startBroadcast(contacts, message, delay || 3000);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Erro ao iniciar broadcast:', error);
    res.status(500).json({ error: 'Erro ao iniciar envio em massa' });
  }
});

// Nova rota para agendamento de mensagens
app.post('/api/broadcasts/schedule', ensureClientReady, async (req, res) => {
  try {
    const { contacts, message, scheduledTime, delay } = req.body;
    
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'Lista de contatos é obrigatória' });
    }
    
    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }
    
    if (!scheduledTime) {
      return res.status(400).json({ error: 'Data de agendamento é obrigatória' });
    }
    
    const result = await massMessageService.scheduleBroadcast(contacts, message, scheduledTime, delay || 3000);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Erro ao agendar broadcast:', error);
    res.status(500).json({ error: error.message || 'Erro ao agendar envio em massa' });
  }
});

app.get('/api/broadcasts', (req, res) => {
  try {
    const broadcasts = massMessageService.getAllBroadcasts();
    res.json(broadcasts);
  } catch (error) {
    logger.error('Erro ao listar broadcasts:', error);
    res.status(500).json({ error: 'Erro ao listar broadcasts' });
  }
});

app.get('/api/broadcasts/:id', (req, res) => {
  try {
    const broadcastStatus = massMessageService.getBroadcastStatus(req.params.id);
    
    if (!broadcastStatus) {
      return res.status(404).json({ error: 'Broadcast não encontrado' });
    }
    
    res.json(broadcastStatus);
  } catch (error) {
    logger.error('Erro ao buscar status do broadcast:', error);
    res.status(500).json({ error: 'Erro ao buscar status do broadcast' });
  }
});

// Rotas para agendamento
app.get('/api/schedules', (req, res) => {
  try {
    const schedules = massMessageService.getAllScheduled();
    res.json(schedules);
  } catch (error) {
    logger.error('Erro ao listar agendamentos:', error);
    res.status(500).json({ error: 'Erro ao listar agendamentos' });
  }
});

app.get('/api/schedules/pending', (req, res) => {
  try {
    const pendingSchedules = massMessageService.getPendingScheduled();
    res.json(pendingSchedules);
  } catch (error) {
    logger.error('Erro ao listar agendamentos pendentes:', error);
    res.status(500).json({ error: 'Erro ao listar agendamentos pendentes' });
  }
});

// Rotas para envio de mídia
app.post('/api/broadcasts/media', ensureClientReady, upload.single('media'), async (req, res) => {
  try {
    const { contacts, caption, delay } = req.body;
    const contactsList = JSON.parse(contacts);
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    if (!contactsList || !Array.isArray(contactsList) || contactsList.length === 0) {
      return res.status(400).json({ error: 'Lista de contatos é obrigatória' });
    }
    
    const mediaPath = req.file.path;
    
    const result = await massMessageService.startMediaBroadcast(
      contactsList, 
      mediaPath, 
      caption || '', 
      parseInt(delay) || 3000
    );
    
    res.status(201).json(result);
  } catch (error) {
    logger.error('Erro ao iniciar broadcast de mídia:', error);
    res.status(500).json({ error: 'Erro ao iniciar envio em massa de mídia' });
  }
});

// Nova rota para agendamento de mensagens com mídia
app.post('/api/broadcasts/media/schedule', ensureClientReady, upload.single('media'), async (req, res) => {
  try {
    const { contacts, caption, scheduledTime, delay } = req.body;
    const contactsList = JSON.parse(contacts);
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    if (!contactsList || !Array.isArray(contactsList) || contactsList.length === 0) {
      return res.status(400).json({ error: 'Lista de contatos é obrigatória' });
    }
    
    if (!scheduledTime) {
      return res.status(400).json({ error: 'Data de agendamento é obrigatória' });
    }
    
    const mediaPath = req.file.path;
    
    const result = await massMessageService.scheduleMediaBroadcast(
      contactsList, 
      mediaPath, 
      caption || '', 
      scheduledTime,
      parseInt(delay) || 3000
    );
    
    res.status(201).json(result);
  } catch (error) {
    logger.error('Erro ao agendar broadcast de mídia:', error);
    res.status(500).json({ error: error.message || 'Erro ao agendar envio em massa de mídia' });
  }
});

// Inicia o servidor
initializeServices().then(() => {
  app.listen(port, () => {
    logger.info(`Servidor iniciado na porta ${port}`);
    
    // Adicionar mensagem clara no console com a URL
    console.log('\x1b[36m%s\x1b[0m', `🚀 Aplicação rodando em http://localhost:${port}`);
    console.log('\x1b[33m%s\x1b[0m', `⚠️  Se o navegador não abrir automaticamente, acesse a URL acima manualmente.`);
  });
});

module.exports = app;