const REPORT_VIEWER_READY = 'central-empresas-report-viewer-ready';
const REPORT_VIEWER_PAYLOAD = 'central-empresas-report-viewer-payload';
const REPORT_VIEWER_EXPIRED = 'central-empresas-report-viewer-expired';
const reportId = new URLSearchParams(window.location.search).get('report');
const reportFrame = document.getElementById('reportFrame');
const viewerStatus = document.getElementById('viewerStatus');
const viewerTitle = document.getElementById('viewerTitle');
const viewerPrint = document.getElementById('viewerPrint');
const viewerDownloads = document.getElementById('viewerDownloads');
const viewerDownloadsCount = document.getElementById('viewerDownloadsCount');
const viewerDownloadList = document.getElementById('viewerDownloadList');
const viewerDownloadStatus = document.getElementById('viewerDownloadStatus');
let loaded = false;
let frameResizeObserver = null;
let expirationTimer = null;
let documentGroups = [];

function safeFilename(value) {
  const normalized = String(value || 'formulario').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return normalized.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'formulario';
}

function collectDocumentGroups(reportDocument) {
  return [...reportDocument.querySelectorAll('.document[data-documento]')].reduce((groups, page) => {
    const title = page.dataset.documento?.trim() || `Formulário ${groups.length + 1}`;
    const current = groups.at(-1);
    if (current?.title === title) current.pages.push(page);
    else groups.push({ title, pages: [page] });
    return groups;
  }, []);
}

function pageLabel(count) {
  return count === 1 ? '1 página' : `${count} páginas`;
}

function setDownloadButtonsDisabled(disabled) {
  viewerDownloadList.querySelectorAll('button').forEach(button => { button.disabled = disabled; });
}

async function downloadDocumentGroup(group, index) {
  if (!loaded) return;
  if (!window.html2canvas || !window.jspdf?.jsPDF) {
    viewerDownloadStatus.textContent = 'Não foi possível preparar o PDF. Verifique sua conexão e tente novamente.';
    return;
  }
  setDownloadButtonsDisabled(true);
  viewerDownloadStatus.textContent = `Preparando ${group.title}…`;
  try {
    const pdf = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    for (let pageIndex = 0; pageIndex < group.pages.length; pageIndex += 1) {
      if (pageIndex > 0) pdf.addPage('a4', 'portrait');
      const canvas = await window.html2canvas(group.pages[pageIndex], {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }
    const filename = `${String(index + 1).padStart(2, '0')}-${safeFilename(group.title)}.pdf`;
    pdf.save(filename);
    viewerDownloadStatus.textContent = `${group.title} baixado em PDF.`;
  } catch (error) {
    console.error(error);
    viewerDownloadStatus.textContent = `Não foi possível baixar ${group.title}. Tente novamente.`;
  } finally {
    if (loaded) setDownloadButtonsDisabled(false);
  }
}

function renderDownloadOptions(reportDocument) {
  documentGroups = collectDocumentGroups(reportDocument);
  viewerDownloadList.replaceChildren();
  viewerDownloadStatus.textContent = '';
  viewerDownloads.hidden = documentGroups.length === 0;
  if (!documentGroups.length) return;
  viewerDownloadsCount.textContent = `${documentGroups.length} ${documentGroups.length === 1 ? 'formulário' : 'formulários'}`;
  documentGroups.forEach((group, index) => {
    const item = document.createElement('article');
    item.className = 'viewer-download-item';
    const number = document.createElement('span');
    number.className = 'viewer-download-item__number';
    number.textContent = String(index + 1).padStart(2, '0');
    const description = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = group.title;
    const pages = document.createElement('small');
    pages.textContent = pageLabel(group.pages.length);
    description.append(title, pages);
    const button = document.createElement('button');
    button.className = 'viewer-download-button';
    button.type = 'button';
    button.textContent = 'Baixar PDF';
    button.addEventListener('click', () => downloadDocumentGroup(group, index));
    item.append(number, description, button);
    viewerDownloadList.append(item);
  });
}

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
  documentGroups = [];
  viewerDownloadList.replaceChildren();
  viewerDownloads.hidden = true;
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
  renderDownloadOptions(reportFrame.contentDocument);
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
