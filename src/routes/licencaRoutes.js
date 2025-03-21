// routes/licencaRoutes.js
const express = require('express');
const validarLicenca = require("./validarLicenca");
const router = express.Router();

// Armazenamento temporário de licenças válidas (usar uma solução de persistência em produção)
let validLicenses = new Set();

// Endpoint para validar licença
router.post('/validar-licenca', async (req, res) => {
    const { licenseKey, email } = req.body;
    
    if (!licenseKey) {
        return res.status(400).json({ valid: false, message: "Chave de licença não fornecida." });
    }
    
    try {
        const resultado = await validarLicenca(licenseKey, email);
        
        if (resultado.valido) {
            // Armazenar licença válida em memória
            validLicenses.add(licenseKey);
            
            res.json({ 
                valid: true, 
                message: resultado.mensagem,
                data: resultado.dados 
            });
        } else {
            res.json({ 
                valid: false, 
                message: resultado.mensagem 
            });
        }
    } catch (error) {
        console.error('Erro ao validar licença:', error);
        res.status(500).json({ 
            valid: false, 
            message: "Erro ao validar a licença: " + error.message 
        });
    }
});

// Middleware para verificar licença em requisições protegidas
const verificarLicenca = (req, res, next) => {
    // Em uma aplicação real, você pode verificar a licença por sessão, token ou outro método
    // Para este exemplo, usaremos um cabeçalho simples
    const licenseKey = req.headers['x-license-key'];
    
    if (!licenseKey || !validLicenses.has(licenseKey)) {
        return res.status(403).json({ 
            error: 'Licença inválida ou não encontrada',
            redirect: '/license.html'
        });
    }
    
    next();
};

module.exports = {
    router,
    verificarLicenca
};