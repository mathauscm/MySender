/**
 * Módulo para gerenciar a lista de contatos
 */
import { escapeHtml } from '../utils.js';
import { fetchContacts } from '../services/contactService.js';

// Estado local
let contacts = [];
let selectedContacts = [];
let contactListEl;
let searchInputEl;
let onSelectionChange;
let autoRetryTimer;
let isLoading = false;

// Inicializa o componente
export function init(options) {
  contactListEl = document.getElementById(options.contactListId);
  searchInputEl = document.getElementById(options.searchInputId);
  onSelectionChange = options.onSelectionChange || (() => {});
  
  // Configurar event listeners
  searchInputEl.addEventListener('input', handleSearch);
  
  // Botões
  if (options.refreshBtnId) {
    document.getElementById(options.refreshBtnId).addEventListener('click', loadContacts);
  }
  
  if (options.selectAllBtnId) {
    document.getElementById(options.selectAllBtnId).addEventListener('click', selectAllContacts);
  }
  
  if (options.clearSelectionBtnId) {
    document.getElementById(options.clearSelectionBtnId).addEventListener('click', clearSelection);
  }
  
  // Carregar contatos iniciais
  loadContacts();
  
  return {
    getContacts: () => contacts,
    getSelectedContacts: () => selectedContacts,
    setSelectedContacts: (newSelection) => {
      selectedContacts = newSelection;
      renderContacts(contacts);
      onSelectionChange(selectedContacts);
    },
    clearSelection,
    refresh: loadContacts
  };
}

// Carrega a lista de contatos
async function loadContacts() {
  // Evitar múltiplas chamadas simultâneas
  if (isLoading) return;
  
  isLoading = true;
  
  // Limpar qualquer timer de auto-retentativa existente
  if (autoRetryTimer) {
    clearTimeout(autoRetryTimer);
    autoRetryTimer = null;
  }

  try {
    contactListEl.innerHTML = '<div class="loading-indicator">Carregando contatos...</div>';
    
    const response = await fetch('/api/contacts');

    if (response.status === 503) {
      // Cliente WhatsApp não está pronto
      const data = await response.json();
      contactListEl.innerHTML = `
        <div class="warning-message">
          <p>${data.error}</p>
          <p class="small">Tentando novamente em 5 segundos...</p>
        </div>
      `;
      
      // Agendar nova tentativa
      autoRetryTimer = setTimeout(loadContacts, 5000);
      return;
    }
    
    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }
    
    contacts = await response.json();
    renderContacts(contacts);
  } catch (error) {
    console.error('Erro ao carregar contatos:', error);
    contactListEl.innerHTML = `
      <div class="error-message">
        <p>Erro ao carregar contatos</p>
        <p class="small">Tentando novamente em 10 segundos...</p>
      </div>
    `;
    
    // Agendar nova tentativa com um intervalo maior
    autoRetryTimer = setTimeout(loadContacts, 10000);
  } finally {
    isLoading = false;
  }
}

// Renderiza a lista de contatos
function renderContacts(contactsToRender) {
  if (!contactsToRender || contactsToRender.length === 0) {
    contactListEl.innerHTML = '<div class="empty-message">Nenhum contato encontrado</div>';
    return;
  }
  
  const selectedIds = selectedContacts.map(c => c.id);
  
  contactListEl.innerHTML = contactsToRender.map(contact => `
    <div class="list-group-item list-group-item-action contact-item ${selectedIds.includes(contact.id) ? 'selected-contact' : ''}" 
         data-id="${contact.id}">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <div class="fw-bold">${escapeHtml(contact.name)}</div>
          <small class="text-muted">${contact.displayPhone}</small>
        </div>
        <div class="form-check">
          <input class="form-check-input contact-checkbox" type="checkbox" 
                 ${selectedIds.includes(contact.id) ? 'checked' : ''}>
        </div>
      </div>
    </div>
  `).join('');
  
  // Adicionar listeners para seleção
  document.querySelectorAll('.contact-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('form-check-input')) return;
      
      const contactId = item.dataset.id;
      const checkbox = item.querySelector('.contact-checkbox');
      checkbox.checked = !checkbox.checked;
      
      toggleContactSelection(contactId, checkbox.checked);
    });
    
    const checkbox = item.querySelector('.contact-checkbox');
    checkbox.addEventListener('change', (e) => {
      const contactId = item.dataset.id;
      toggleContactSelection(contactId, e.target.checked);
    });
  });
}

// Alterna seleção de contato
function toggleContactSelection(contactId, isSelected) {
  if (isSelected) {
    const contact = contacts.find(c => c.id === contactId);
    if (contact && !selectedContacts.some(c => c.id === contactId)) {
      selectedContacts.push(contact);
    }
  } else {
    selectedContacts = selectedContacts.filter(c => c.id !== contactId);
  }
  
  // Atualizar UI
  const contactItem = document.querySelector(`.contact-item[data-id="${contactId}"]`);
  if (contactItem) {
    if (isSelected) {
      contactItem.classList.add('selected-contact');
    } else {
      contactItem.classList.remove('selected-contact');
    }
  }
  
  // Notificar mudança
  onSelectionChange(selectedContacts);
}

// Manipulador de pesquisa
function handleSearch(e) {
  const searchTerm = e.target.value.trim().toLowerCase();
  
  if (searchTerm === '') {
    renderContacts(contacts);
  } else {
    const filtered = contacts.filter(contact => 
      contact.name.toLowerCase().includes(searchTerm) || 
      contact.number.includes(searchTerm)
    );
    renderContacts(filtered);
  }
}

// Selecionar todos os contatos
function selectAllContacts() {
  selectedContacts = [...contacts];
  renderContacts(contacts);
  onSelectionChange(selectedContacts);
}

// Limpar seleção
function clearSelection() {
  selectedContacts = [];
  renderContacts(contacts);
  onSelectionChange(selectedContacts);
}