/**
 * Serviço para agendamento de mensagens
 */

/**
 * Obtém lista de agendamentos
 * @returns {Promise<Array>} Lista de agendamentos
 */
export async function fetchScheduledList() {
  try {
    const response = await fetch('/api/schedules');

    if (!response.ok) {
      throw new Error('Falha ao buscar agendamentos');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    throw error;
  }
}

/**
 * Agenda envio de mensagem de texto
 * @param {Array} contacts Array de contatos para enviar a mensagem
 * @param {string} message Texto da mensagem
 * @param {Date|string} scheduledTime Data e hora para envio agendado
 * @param {number} delay Intervalo entre envios em ms
 * @returns {Promise<Object>} Resultado do agendamento
 */
export async function scheduleBroadcast(contacts, message, scheduledTime, delay) {
  try {
    const response = await fetch('/api/broadcasts/schedule', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contacts,
        message,
        scheduledTime: new Date(scheduledTime).toISOString(),
        delay
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Falha ao agendar envio');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao agendar envio em massa:', error);
    throw error;
  }
}

/**
 * Agenda mídia em massa com ou sem legenda
 * @param {Array} contacts Lista de contatos para enviar
 * @param {Array|File} mediaFiles Arquivo(s) de mídia a ser(em) enviado(s)
 * @param {string} caption Texto opcional da legenda
 * @param {string} scheduledTime Data/hora para envio no formato ISO
 * @param {number} delay Intervalo entre envios em ms
 * @returns {Promise<Object>} Resultado do agendamento
 */
export async function scheduleMediaBroadcast(contacts, mediaFiles, caption, scheduledTime, delay) {
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
    formData.append('scheduledTime', scheduledTime);
    formData.append('delay', delay.toString());

    const response = await fetch('/api/broadcasts/media/schedule', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Falha ao agendar envio de mídia');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao agendar envio em massa de mídia:', error);
    throw error;
  }
}