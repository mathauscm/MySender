/**
 * Serviço para gerenciar contatos
 */

// Busca todos os contatos
export async function fetchContacts() {
    try {
      const response = await fetch('/api/contacts');
      
      if (!response.ok) {
        throw new Error('Falha ao buscar contatos');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar contatos:', error);
      throw error;
    }
  }
  
  // Busca contatos por termo
  export async function searchContacts(searchTerm) {
    try {
      if (!searchTerm || searchTerm.trim() === '') {
        return await fetchContacts();
      }
  
      const response = await fetch(`/api/contacts/search?q=${encodeURIComponent(searchTerm)}`);
      
      if (!response.ok) {
        throw new Error('Falha ao buscar contatos');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar contatos:', error);
      throw error;
    }
  }