const REPORT_VIEWER_READY = 'central-empresas-report-viewer-ready';
const REPORT_VIEWER_PAYLOAD = 'central-empresas-report-viewer-payload';
const REPORT_VIEWER_EXPIRED = 'central-empresas-report-viewer-expired';
const reportId = new URLSearchParams(window.location.search).get('report');
const reportFrame = document.getElementById('reportFrame');
const viewerStatus = document.getElementById('viewerStatus');
const viewerTitle = document.getElementById('viewerTitle');
const viewerPrint = document.getElementById('viewerPrint');
let loaded = false;
let frameResizeObserver = null;
let expirationTimer = null;

function showError(message) {
  viewerStatus.textContent = message;
  viewerStatus.classList.add('viewer-status--error');
  viewerStatus.hidden = false;
  reportFrame.style.display = 'none';
}

function requestReport() {
  if (!window.opener || window.opener.closed || !reportId) {
    showError('Este documento não está mais disponível. Volte à Central Empresas e gere-o novamente.');
    return;
  }
  window.opener.postMessage({ type: REPORT_VIEWER_READY, reportId }, '*');
}

function expireReport() {
  loaded = false;
  window.clearTimeout(expirationTimer);
  frameResizeObserver?.disconnect();
  reportFrame.srcdoc = '';
  reportFrame.style.display = 'none';
  viewerPrint.disabled = true;
  showError('Este documento expirou por segurança. Volte à Central Empresas e gere-o novamente.');
}

window.addEventListener('message', event => {
  if (event.source !== window.opener || event.data?.reportId !== reportId) return;
  if (event.data.type === REPORT_VIEWER_EXPIRED) {
    expireReport();
    return;
  }
  if (event.data.type !== REPORT_VIEWER_PAYLOAD) return;
  const remainingLifetime = Number(event.data.expiresAt) - Date.now();
  if (!Number.isFinite(remainingLifetime) || remainingLifetime <= 0) {
    expireReport();
    return;
  }
  loaded = true;
  window.clearTimeout(expirationTimer);
  expirationTimer = window.setTimeout(expireReport, remainingLifetime);
  viewerTitle.textContent = event.data.title || 'Documento';
  document.title = `${viewerTitle.textContent} | Central Empresas`;
  reportFrame.srcdoc = event.data.html;
});

reportFrame.addEventListener('load', async () => {
  if (!loaded) return;
  try {
    await reportFrame.contentDocument.fonts?.ready;
  } catch (_) {}
  const images = [...reportFrame.contentDocument.images];
  await Promise.all(images.map(image => image.complete ? Promise.resolve() : new Promise(resolve => {
    image.addEventListener('load', resolve, { once: true });
    image.addEventListener('error', resolve, { once: true });
  })));

  const syncFrameHeight = () => {
    const reportDocument = reportFrame.contentDocument;
    const documentHeight = Math.max(
      reportDocument.documentElement.scrollHeight,
      reportDocument.body.scrollHeight,
      reportDocument.querySelector('.page')?.getBoundingClientRect().bottom || 0
    );
    reportFrame.style.height = `${Math.ceil(Math.max(documentHeight, 1123))}px`;
  };
  syncFrameHeight();
  requestAnimationFrame(() => requestAnimationFrame(syncFrameHeight));
  frameResizeObserver?.disconnect();
  frameResizeObserver = new ResizeObserver(syncFrameHeight);
  frameResizeObserver.observe(reportFrame.contentDocument.documentElement);
  frameResizeObserver.observe(reportFrame.contentDocument.body);
  reportFrame.style.display = 'block';
  viewerStatus.hidden = true;
  viewerPrint.disabled = false;
});

viewerPrint.addEventListener('click', () => {
  if (!loaded) return;
  reportFrame.contentWindow.focus();
  reportFrame.contentWindow.print();
});

document.getElementById('viewerClose').addEventListener('click', () => window.close());

requestReport();
const retryTimer = window.setInterval(() => {
  if (loaded) {
    window.clearInterval(retryTimer);
    return;
  }
  requestReport();
}, 500);
window.setTimeout(() => {
  if (!loaded) {
    window.clearInterval(retryTimer);
    showError('Não foi possível carregar o documento. Volte à Central Empresas e tente novamente.');
  }
}, 10000);
