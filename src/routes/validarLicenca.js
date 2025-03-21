// routes/validarLicenca.js (versão com logs adicionais)
const buscarLicenca = require("./buscarLicenca");

async function validarLicenca(licenseKey, email = null) {
    console.log(`Iniciando validação para licença: ${licenseKey}, email: ${email || 'não fornecido'}`);
    
    const licenca = await buscarLicenca(licenseKey);
    if (!licenca) {
        console.log(`Licença não encontrada: ${licenseKey}`);
        return { valido: false, mensagem: "Licença não encontrada." };
    }
    
    console.log(`Validando licença: ${JSON.stringify(licenca)}`);
    
    const agora = new Date();
    const expiraEm = new Date(licenca.expiresAt);
    
    // Verificar se a licença está ativa e não expirou
    if (!licenca.isActive) {
        console.log(`Licença inativa: ${licenseKey}`);
        return { valido: false, mensagem: "Licença inativa." };
    }
    
    if (agora > expiraEm) {
        console.log(`Licença expirada: ${licenseKey}, expirou em ${expiraEm.toISOString()}`);
        return { valido: false, mensagem: "Licença expirada." };
    }
    
    // Se o email foi fornecido, verificar se corresponde ao email na licença
    if (email && licenca.email && email.toLowerCase() !== licenca.email.toLowerCase()) {
        console.log(`Email não corresponde: fornecido=${email}, licença=${licenca.email}`);
        return { valido: false, mensagem: "Email não corresponde ao registrado na licença." };
    }
    
    console.log(`Licença validada com sucesso: ${licenseKey}`);
    return { 
        valido: true, 
        mensagem: "Licença válida e ativa.", 
        dados: {
            expiresAt: licenca.expiresAt,
            email: licenca.email
        } 
    };
}

module.exports = validarLicenca;