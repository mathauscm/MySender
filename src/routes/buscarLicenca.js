// routes/buscarLicenca.js (versão modificada com logs)
const axios = require('axios');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const REPO_OWNER = "mathauscm";
const REPO_NAME = "mysender-licenses";
const BASE_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data`;

async function buscarLicenca(licenseKey) {
    try {
        const url = `${BASE_URL}/${licenseKey}.json`;
        console.log(`Buscando licença: ${url}`);
        
        const response = await axios.get(url, {
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                Accept: "application/vnd.github.v3+json"
            }
        });
        
        console.log(`Resposta recebida do GitHub: ${response.status}`);
        
        // O conteúdo retornado pela API é codificado em base64, então decodificamos
        const fileContent = Buffer.from(response.data.content, 'base64').toString('utf8');
        const licenseData = JSON.parse(fileContent);
        console.log(`Dados da licença encontrados:`, licenseData);
        
        return licenseData; // Retorna os dados da licença decodificados
    } catch (error) {
        if (error.response) {
            console.error(`Erro na API GitHub (status ${error.response.status}):`, error.response.data);
            
            // Verificar se o token pode estar expirado
            if (error.response.status === 401) {
                console.error("O token do GitHub pode estar expirado ou inválido");
            }
            
            // Verificar se o arquivo não foi encontrado
            if (error.response.status === 404) {
                console.error(`Arquivo de licença não encontrado: ${licenseKey}.json`);
            }
        } else {
            console.error("Erro ao buscar licença:", error.message);
        }
        return null;
    }
}

module.exports = buscarLicenca;