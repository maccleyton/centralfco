(() => {
  const agencyLabel = document.querySelector('[data-footer-agency]');
  if (!agencyLabel) return;

  try {
    const session = JSON.parse(sessionStorage.getItem('centralFcoSessionV1') || 'null');
    const prefix = session?.agencia?.prefixo;
    if (prefix) agencyLabel.textContent = `Central Empresas · Agência ${prefix}`;
  } catch (_) {
    // Mantém a agência padrão quando o armazenamento da sessão não está disponível.
  }
})();
