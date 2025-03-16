/**
 * Funções utilitárias para o aplicativo
 */

// Escapa caracteres HTML para evitar injeção de código
export function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
  // Formata o status do broadcast
  export function formatStatus(status) {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'in_progress': return 'Em Andamento';
      case 'failed': return 'Falhou';
      case 'completed_with_errors': return 'Concluído com Erros';
      default: return status;
    }
  }
  
  // Retorna a classe CSS para o badge de status
  export function getStatusBadgeClass(status) {
    switch (status) {
      case 'completed': return 'bg-success';
      case 'in_progress': return 'bg-primary';
      case 'failed': return 'bg-danger';
      case 'completed_with_errors': return 'bg-warning';
      default: return 'bg-secondary';
    }
  }
  
  // Função para mostrar mensagens de erro
  export function showError(message) {
    alert(message);
  }
  
  // Trunca texto para exibição
  export function truncateText(text, maxLength = 50) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }