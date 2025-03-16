/**
 * Serviço para envio de mensagens
 */

// Obtém histórico de broadcasts
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
  
  // Envia mensagem em massa
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
  
  // Envia mídia em massa
  export async function sendMediaBroadcast(contacts, mediaFile, caption, delay) {
    try {
      const formData = new FormData();
      formData.append('media', mediaFile);
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