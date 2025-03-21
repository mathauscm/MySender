/**
 * Módulo para tratamento de licença
 * Responsável por verificar e gerenciar a licença no frontend
 */

export function setupLicenseValidation() {
    const LICENSE_STORAGE_KEY = 'mysenderLicense';
    let licenseData = null;
    
    try {
      const savedLicense = localStorage.getItem(LICENSE_STORAGE_KEY);
      if (savedLicense) {
        licenseData = JSON.parse(savedLicense);
      }
    } catch (e) {
      console.error('Erro ao carregar dados da licença:', e);
      localStorage.removeItem(LICENSE_STORAGE_KEY);
    }
    
    // Adiciona o cabeçalho de licença a todas as requisições fetch
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
      options = options || {};
      options.headers = options.headers || {};
      
      // Adicionar cabeçalho de licença se existir
      if (licenseData && licenseData.key) {
        options.headers['X-License-Key'] = licenseData.key;
      }
      
      return originalFetch.call(this, url, options)
        .then(response => {
          // Verificar se houve erro de licença
          if (response.status === 403) {
            return response.json().then(data => {
              if (data.redirect) {
                console.error('Erro de licença detectado, redirecionando...');
                // Limpar licença inválida
                clearLicense();
                // Redirecionar para página de licença
                window.location.href = data.redirect;
                return Promise.reject(new Error('Licença inválida'));
              }
              return Promise.reject(data);
            });
          }
          return response;
        });
    };
    
    // Adiciona o cabeçalho de licença a todas as requisições XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function() {
      const result = originalXHROpen.apply(this, arguments);
      
      if (licenseData && licenseData.key) {
        this.setRequestHeader('X-License-Key', licenseData.key);
      }
      
      return result;
    };
    
    // Verificar se existe uma licença salva
    function hasValidLicense() {
      return licenseData !== null && licenseData.key;
    }
    
    // Verificar se a licença está expirada
    function isLicenseExpired() {
      if (!licenseData || !licenseData.expiresAt) return false;
      
      try {
        const expiryDate = new Date(licenseData.expiresAt);
        const now = new Date();
        return now > expiryDate;
      } catch (e) {
        console.error('Erro ao verificar expiração da licença:', e);
        return false;
      }
    }
    
    // Salvar licença
    function saveLicense(license, email, expiresAt) {
      licenseData = {
        key: license,
        email: email,
        expiresAt: expiresAt
      };
      localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(licenseData));
    }
    
    // Limpar licença
    function clearLicense() {
      licenseData = null;
      localStorage.removeItem(LICENSE_STORAGE_KEY);
    }
    
    // Validar licença no servidor
    async function validateLicense(license, email) {
      try {
        const payload = { licenseKey: license };
        if (email) payload.email = email;
        
        const response = await originalFetch.call(window, '/api/validar-licenca', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (data.valid) {
          saveLicense(
            license, 
            data.data?.email || email,
            data.data?.expiresAt
          );
          return true;
        } else {
          clearLicense();
          return false;
        }
      } catch (error) {
        console.error('Erro ao validar licença:', error);
        return false;
      }
    }
    
    // API pública
    return {
      hasValidLicense,
      isLicenseExpired,
      validateLicense,
      saveLicense,
      clearLicense,
      getLicense: () => licenseData
    };
  }