/**
 * Serviço para agendamento de mensagens
 */

// Obtém lista de agendamentos
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
  
  // Agenda envio de mensagem
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
  
  // Agenda envio de mídia
  export async function scheduleMediaBroadcast(contacts, mediaFile, caption, scheduledTime, delay) {
    try {
      const formData = new FormData();
      formData.append('media', mediaFile);
      formData.append('contacts', JSON.stringify(contacts));
      formData.append('caption', caption || '');
      formData.append('scheduledTime', new Date(scheduledTime).toISOString());
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