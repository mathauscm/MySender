/**
 * Serviço para envio de mensagens
 */

/**
 * Obtém histórico de broadcasts
 * @returns {Promise<Array>} Lista de broadcasts realizados
 */
export async function fetchBroadcastHistory() {
  try {
    const response = await fetch('/api/broadcasts');

    if (!response.ok) {
      throw new Error('Falha ao buscar histórico');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    throw error;
  }
}

/**
 * Envia mensagem de texto em massa
 * @param {Array} contacts Lista de contatos para enviar
 * @param {string} message Texto da mensagem
 * @param {number} delay Intervalo entre envios em ms
 * @returns {Promise<Object>} Resultado do envio
 */
export async function sendBroadcast(contacts, message, delay) {
  try {
    const response = await fetch('/api/broadcasts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contacts,
        message,
        delay
      })
    });

    if (!response.ok) {
      throw new Error('Falha ao iniciar envio');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao iniciar envio em massa:', error);
    throw error;
  }
}

/**
 * Envia mídia em massa com ou sem legenda
 * @param {Array} contacts Lista de contatos para enviar
 * @param {Array|File} mediaFiles Arquivo(s) de mídia a ser(em) enviado(s)
 * @param {string} caption Texto opcional da legenda
 * @param {number} delay Intervalo entre envios em ms
 * @returns {Promise<Object>} Resultado do envio
 */
export async function sendMediaBroadcast(contacts, mediaFiles, caption, delay) {
  try {
    const formData = new FormData();

    // Verificar se mediaFiles é um array ou um único arquivo
    if (Array.isArray(mediaFiles)) {
      // Múltiplos arquivos
      mediaFiles.forEach((file, index) => {
        formData.append('media', file);
      });
    } else {
      // Único arquivo (compatibilidade com versão anterior)
      formData.append('media', mediaFiles);
    }

    formData.append('contacts', JSON.stringify(contacts));
    formData.append('caption', caption || '');
    formData.append('delay', delay.toString());

    const response = await fetch('/api/broadcasts/media', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Falha ao iniciar envio de mídia');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao iniciar envio em massa de mídia:', error);
    throw error;
  }
}