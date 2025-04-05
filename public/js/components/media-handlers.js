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

  // Arquivos selecionados pelo usuário
  let selectedMediaFiles = [];

  // Mostrar preview quando arquivos forem selecionados
  if (mediaInput) {
    mediaInput.addEventListener('change', (e) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      selectedMediaFiles = Array.from(files);

      if (files.length === 1) {
        // Caso de um único arquivo - comportamento semelhante ao anterior
        const file = files[0];
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
      } else {
        // Caso de múltiplos arquivos
        mediaName.textContent = `${files.length} arquivos selecionados`;

        // Agrupar tipos para exibição
        const fileTypes = {};
        let totalSize = 0;

        Array.from(files).forEach(file => {
          totalSize += file.size;

          if (file.type.startsWith('image/')) {
            fileTypes.imagens = (fileTypes.imagens || 0) + 1;
          } else if (file.type.startsWith('video/')) {
            fileTypes.videos = (fileTypes.videos || 0) + 1;
          } else if (file.type.startsWith('audio/')) {
            fileTypes.audios = (fileTypes.audios || 0) + 1;
          } else if (file.type === 'application/pdf') {
            fileTypes.pdfs = (fileTypes.pdfs || 0) + 1;
          } else {
            fileTypes.outros = (fileTypes.outros || 0) + 1;
          }
        });

        // Usar ícone padrão para múltiplos arquivos
        mediaThumbnail.src = 'img/multiple-files-icon.svg';

        // Criar texto descritivo dos tipos
        const typeTexts = [];
        if (fileTypes.imagens) typeTexts.push(`${fileTypes.imagens} imagens`);
        if (fileTypes.videos) typeTexts.push(`${fileTypes.videos} vídeos`);
        if (fileTypes.audios) typeTexts.push(`${fileTypes.audios} áudios`);
        if (fileTypes.pdfs) typeTexts.push(`${fileTypes.pdfs} PDFs`);
        if (fileTypes.outros) typeTexts.push(`${fileTypes.outros} outros`);

        mediaType.textContent = `Tipos: ${typeTexts.join(', ')} (${formatFileSize(totalSize)})`;
      }

      mediaPreview.classList.remove('d-none');
    });
  }

  // Botão para limpar mídia selecionada
  if (clearMediaBtn) {
    clearMediaBtn.addEventListener('click', () => {
      if (mediaInput) mediaInput.value = '';
      selectedMediaFiles = [];
      mediaPreview.classList.add('d-none');
    });
  }

  // Retornar métodos para manipular externamente
  return {
    getSelectedMedia: () => selectedMediaFiles,
    clearSelectedMedia: () => {
      if (mediaInput) mediaInput.value = '';
      selectedMediaFiles = [];
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