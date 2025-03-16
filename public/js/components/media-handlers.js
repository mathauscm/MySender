/**
 * Módulo para manipulação de mídia
 */

/**
 * Configura manipuladores para elementos de mídia na interface
 * @param {string} mediaInputId ID do input de arquivo
 * @param {string} clearBtnId ID do botão de limpar
 * @param {string} previewId ID do container de preview
 * @param {string} thumbnailId ID da imagem de thumbnail
 * @param {string} nameId ID do elemento que mostra o nome do arquivo
 * @param {string} typeId ID do elemento que mostra o tipo do arquivo
 * @returns {Object} API para manipular mídia
 */
export function setupMediaHandlers(mediaInputId, clearBtnId, previewId, thumbnailId, nameId, typeId) {
  const mediaInput = document.getElementById(mediaInputId);
  const clearMediaBtn = document.getElementById(clearBtnId);
  const mediaPreview = document.getElementById(previewId);
  const mediaThumbnail = document.getElementById(thumbnailId);
  const mediaName = document.getElementById(nameId);
  const mediaType = document.getElementById(typeId);
  
  // Arquivo selecionado pelo usuário
  let selectedMediaFile = null;
  
  // Mostrar preview quando uma mídia for selecionada
  if (mediaInput) {
    mediaInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      selectedMediaFile = file;
      mediaName.textContent = file.name;
      
      // Determinar o tipo de mídia
      let typeText = 'Arquivo';
      if (file.type.startsWith('image/')) {
        typeText = 'Imagem';
        // Criar thumbnail para imagens
        const reader = new FileReader();
        reader.onload = (event) => {
          mediaThumbnail.src = event.target.result;
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        typeText = 'Vídeo';
        // Usar ícone para vídeos
        mediaThumbnail.src = 'img/video-icon.png';
      } else if (file.type.startsWith('audio/')) {
        typeText = 'Áudio';
        // Usar ícone para áudios
        mediaThumbnail.src = 'img/audio-icon.png';
      } else if (file.type === 'application/pdf') {
        typeText = 'PDF';
        // Usar ícone para PDFs
        mediaThumbnail.src = 'img/pdf-icon.png';
      }
      
      mediaType.textContent = `Tipo: ${typeText} (${formatFileSize(file.size)})`;
      mediaPreview.classList.remove('d-none');
    });
  }
  
  // Botão para limpar mídia selecionada
  if (clearMediaBtn) {
    clearMediaBtn.addEventListener('click', () => {
      if (mediaInput) mediaInput.value = '';
      selectedMediaFile = null;
      mediaPreview.classList.add('d-none');
    });
  }
  
  // Retornar métodos para manipular externamente
  return {
    getSelectedMedia: () => selectedMediaFile,
    clearSelectedMedia: () => {
      if (mediaInput) mediaInput.value = '';
      selectedMediaFile = null;
      mediaPreview.classList.add('d-none');
    }
  };
}

/**
 * Formata tamanho de arquivo em unidades legíveis
 * @param {number} bytes Tamanho em bytes
 * @returns {string} Tamanho formatado (ex: "1.5 MB")
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else return (bytes / 1048576).toFixed(1) + ' MB';
}