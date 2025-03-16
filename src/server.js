// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initialize, logger } = require('./whatsappClient');
const contactService = require('./contactService');
const massMessageService = require('./massMessageService');

const multer = require('multer');

const app = express();
const port = process.env.PORT || 3030;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
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
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}


// Inicializa serviços
async function initializeServices() {
  try {
    // Inicializa o cliente WhatsApp
    initialize();
    
    // Inicia o processador de mensagens
    massMessageService.startProcessor();
    
    logger.info('Serviços inicializados com sucesso!');
  } catch (error) {
    logger.error('Erro ao inicializar serviços:', error);
    process.exit(1);
  }
}

// Rotas para contatos
app.get('/api/contacts', async (req, res) => {
  try {
    const contacts = await contactService.getAllContacts();
    res.json(contacts);
  } catch (error) {
    logger.error('Erro ao buscar contatos:', error);
    res.status(500).json({ error: 'Erro ao buscar contatos' });
  }
});

app.get('/api/contacts/search', async (req, res) => {
  try {
    const { q } = req.query;
    const contacts = await contactService.searchContacts(q);
    res.json(contacts);
  } catch (error) {
    logger.error('Erro ao buscar contatos:', error);
    res.status(500).json({ error: 'Erro ao buscar contatos' });
  }
});

// Rotas para envio em massa
app.post('/api/broadcasts', async (req, res) => {
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

// Rotas para envio de mídia
app.post('/api/broadcasts/media', upload.single('media'), async (req, res) => {
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

// Página inicial
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicializar e iniciar servidor
initializeServices().then(() => {
  app.listen(port, () => {
    logger.info(`Servidor rodando em http://localhost:${port}`);
  });
});