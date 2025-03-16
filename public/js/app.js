/**
 * Arquivo principal da aplicação
 * Responsável por inicializar os componentes e coordenar a comunicação entre eles
 */
import * as ContactList from './components/contactList.js';
import * as BroadcastForm from './components/broadcastForm.js';
import * as ScheduleForm from './components/scheduleForm.js';
import * as HistoryList from './components/historyList.js';
import * as ScheduledList from './components/scheduledList.js';

// Estado compartilhado
let contactListAPI;

// Função de inicialização
document.addEventListener('DOMContentLoaded', () => {
  initializeComponents();
});

// Inicializa todos os componentes
function initializeComponents() {
  // Inicializar lista de contatos
  contactListAPI = ContactList.init({
    contactListId: 'contactList',
    searchInputId: 'searchInput',
    refreshBtnId: 'refreshContactsBtn',
    selectAllBtnId: 'selectAllBtn',
    clearSelectionBtnId: 'clearSelectionBtn',
    onSelectionChange: handleContactSelectionChange
  });
  
  // Inicializar formulário de envio
  BroadcastForm.init({
    formId: 'broadcastForm',
    messageInputId: 'messageInput',
    delayInputId: 'delayInput',
    selectedContactsId: 'selectedContacts',
    selectedCountId: 'selectedCount',
    sendBtnId: 'sendBtn',
    onAfterSend: handleAfterBroadcastSent
  });
  
  // Inicializar formulário de agendamento
  ScheduleForm.init({
    formId: 'scheduleForm',
    messageInputId: 'scheduleMessageInput',
    dateInputId: 'scheduleDateInput',
    timeInputId: 'scheduleTimeInput',
    delayInputId: 'scheduleDelayInput',
    selectedContactsId: 'scheduleSelectedContacts',
    selectedCountId: 'scheduleSelectedCount',
    scheduleBtnId: 'scheduleBtn',
    onAfterSchedule: handleAfterScheduled
  });
  
  // Inicializar histórico
  HistoryList.init({
    historyListId: 'broadcastHistory',
    refreshBtnId: 'refreshHistoryBtn',
    autoRefresh: true,
    refreshInterval: 10000
  });
  
  // Inicializar lista de agendamentos
  ScheduledList.init({
    scheduledListId: 'scheduledList',
    refreshBtnId: 'refreshScheduledBtn',
    autoRefresh: true,
    refreshInterval: 30000
  });
  
  // Adicionar ouvinte para remoção de contatos
  document.addEventListener('contact:remove', handleContactRemove);
}

// Manipulador para alteração de seleção de contatos
function handleContactSelectionChange(selectedContacts) {
  // Atualizar formulários com os contatos selecionados
  BroadcastForm.init({}).updateSelectedContacts(selectedContacts);
  ScheduleForm.init({}).updateSelectedContacts(selectedContacts);
}

// Manipulador para após envio de broadcast
function handleAfterBroadcastSent() {
  // Limpar seleção após envio bem-sucedido
  contactListAPI.clearSelection();
}

// Manipulador para após agendamento
function handleAfterScheduled() {
  // Limpar seleção após agendamento bem-sucedido
  contactListAPI.clearSelection();
}

// Manipulador para remoção de contato
function handleContactRemove(event) {
  const { contactId } = event.detail;
  
  // Atualizar seleção na lista de contatos
  const selectedContacts = contactListAPI.getSelectedContacts()
    .filter(contact => contact.id !== contactId);
  
  contactListAPI.setSelectedContacts(selectedContacts);
}