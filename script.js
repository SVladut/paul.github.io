// script.js - comportament mic: copy-to-clipboard + accesibilitate
document.addEventListener('DOMContentLoaded', () => {
  const copyBtn = document.getElementById('copyBtn');
  const toast = document.getElementById('copiedToast');
  const domain = 'zettacars.ro';

  // Copy domeniu în clipboard și arată toast accesibil
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(domain);
      showToast('Copiat în clipboard!');
    } catch (err) {
      // fallback: select, prompt
      fallbackCopy(domain);
    }
  });

  function fallbackCopy(text) {
    const tmp = document.createElement('textarea');
    tmp.value = text;
    tmp.style.position = 'fixed';
    tmp.style.left = '-9999px';
    document.body.appendChild(tmp);
    tmp.select();
    try {
      document.execCommand('copy');
      showToast('Copiat în clipboard!');
    } catch (e) {
      // dacă nu merge, deschide mailto ca fallback
      window.location.href = 'mailto:contact@zettacars.ro?subject=Interes%20Zettacars.ro';
    } finally {
      document.body.removeChild(tmp);
    }
  }

  // Arată și ascunde toast-ul
  function showToast(message = '') {
    toast.textContent = message;
    toast.hidden = false;
    toast.style.opacity = '1';
    setTimeout(() => {
      toast.hidden = true;
    }, 2200);
  }
});
