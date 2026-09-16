(function (root) {
  'use strict';

  const TEMPLATE_VERSION = 'central-documentos-1.0.0';
  const VIEWER_LIFETIME_MS = 5 * 60 * 1000;
  const EVENTS = Object.freeze({
    ready: 'central-empresas-report-viewer-ready',
    payload: 'central-empresas-report-viewer-payload',
    expired: 'central-empresas-report-viewer-expired'
  });

  function sessionMetadata() {
    let session = {};
    try { session = JSON.parse(root.sessionStorage?.getItem('centralFcoSessionV1') || '{}'); } catch (_) {}
    return {
      templateVersion: TEMPLATE_VERSION,
      issuedAt: new Date().toISOString(),
      employee: session.acesso?.nome || session.employeeName || session.nome || '',
      registration: session.acesso?.matricula || session.employeeRegistration || session.matricula || '',
      agency: session.agencia?.prefixo || session.agency || ''
    };
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[character]);
  }

  function fontCss(baseHref = root.location?.href || '') {
    const asset = file => new URL(`fonte/${file}`, baseHref).href;
    return `@font-face{font-family:"BB Textos";src:url("${asset('BancoDoBrasilTextos-Regular.ttf')}") format("truetype");font-weight:400}@font-face{font-family:"BB Textos";src:url("${asset('BancoDoBrasilTextos-Medium.ttf')}") format("truetype");font-weight:500}@font-face{font-family:"BB Textos";src:url("${asset('BancoDoBrasilTextos-Bold.ttf')}") format("truetype");font-weight:700}@font-face{font-family:"BB Títulos";src:url("${asset('BancoDoBrasilTitulos-Bold.ttf')}") format("truetype");font-weight:700}`;
  }

  function traceText() {
    const meta = sessionMetadata();
    const issued = new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(meta.issuedAt));
    return [`Modelo ${meta.templateVersion}`, `emitido em ${issued}`, meta.registration ? `por ${meta.registration}` : '', meta.agency ? `agência ${meta.agency}` : ''].filter(Boolean).join(' · ');
  }

  function supportFooter(className = 'document-footer') {
    return `<footer class="${escapeHtml(className)}">CRBB: 4004-0001 (capitais e regiões metropolitanas) ou 0800 729 0001 (demais localidades).<br>SAC: 0800 729 0722 · Atendimento para Pessoas com Deficiência Auditiva ou de Fala: 0800 729 0088 · Ouvidoria BB: 0800 729 5678.<br><span class="document-trace">${escapeHtml(traceText())}</span></footer>`;
  }

  function page({ title, logo, body, className = '', footerClass = 'document-footer' }) {
    const titleLength = Array.from(String(title ?? '')).length;
    const titleClass = titleLength > 130 ? ' document-header--dense' : titleLength > 68 ? ' document-header--compact' : '';
    return `<section class="document ${escapeHtml(className)}"><header class="document-header${titleClass}"><img src="${escapeHtml(logo)}" alt="Banco do Brasil"><div><span>CENTRAL EMPRESAS</span><strong>${escapeHtml(title)}</strong></div></header><main class="document-body">${body}</main>${supportFooter(footerClass)}</section>`;
  }

  function enrich(html) {
    const metadata = sessionMetadata();
    const marker = `<meta name="central-document-template" content="${TEMPLATE_VERSION}"><meta name="central-document-issued-at" content="${metadata.issuedAt}">`;
    return String(html).includes('</head>') ? String(html).replace('</head>', `${marker}</head>`) : String(html);
  }

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

  async function waitForDocumentAssets(reportDocument) {
    try { await reportDocument.fonts?.ready; } catch (_) {}
    await Promise.all([...reportDocument.images].map(image => image.complete ? Promise.resolve() : new Promise(resolve => {
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', resolve, { once: true });
    })));
  }

  async function downloadDocumentPages(pages, title, index = 0) {
    if (!root.html2canvas || !root.jspdf?.jsPDF) throw new Error('O gerador de PDF não foi carregado. Verifique sua conexão e tente novamente.');
    const pdf = new root.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
      if (pageIndex > 0) pdf.addPage('a4', 'portrait');
      const canvas = await root.html2canvas(pages[pageIndex], {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      const pageRatio = 210 / 297;
      const canvasRatio = canvas.width / canvas.height;
      const imageWidth = canvasRatio > pageRatio ? 210 : 297 * canvasRatio;
      const imageHeight = canvasRatio > pageRatio ? 210 / canvasRatio : 297;
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.95),
        'JPEG',
        (210 - imageWidth) / 2,
        (297 - imageHeight) / 2,
        imageWidth,
        imageHeight,
        undefined,
        'FAST'
      );
    }
    const filename = `${String(index + 1).padStart(2, '0')}-${safeFilename(title)}.pdf`;
    pdf.save(filename);
    return filename;
  }

  async function downloadDocumentFromHtml(html, title) {
    const frame = root.document.createElement('iframe');
    frame.title = `Preparação do PDF: ${title}`;
    frame.setAttribute('aria-hidden', 'true');
    Object.assign(frame.style, {
      position: 'fixed',
      left: '-10000px',
      top: '0',
      width: '210mm',
      height: '297mm',
      border: '0',
      pointerEvents: 'none'
    });
    root.document.body.append(frame);
    try {
      await new Promise((resolve, reject) => {
        const timer = root.setTimeout(() => reject(new Error('Tempo esgotado ao preparar o PDF.')), 10000);
        frame.addEventListener('load', () => { root.clearTimeout(timer); resolve(); }, { once: true });
        frame.srcdoc = enrich(html);
      });
      await waitForDocumentAssets(frame.contentDocument);
      const groups = collectDocumentGroups(frame.contentDocument);
      const index = groups.findIndex(group => group.title === title);
      if (index < 0) throw new Error('O formulário selecionado não foi encontrado no dossiê.');
      return await downloadDocumentPages(groups[index].pages, groups[index].title, index);
    } finally {
      frame.remove();
    }
  }

  function openViewer() {
    const reportId = root.crypto && typeof root.crypto.randomUUID === 'function'
      ? root.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const viewerUrl = new URL('report-viewer.html', root.location.href);
    viewerUrl.searchParams.set('report', reportId);
    const popup = root.open(viewerUrl.href, '_blank');
    if (!popup) return null;

    const expiresAt = Date.now() + VIEWER_LIFETIME_MS;
    let payload = null;
    let ready = false;
    const send = () => {
      if (!ready || !payload || popup.closed) return;
      popup.postMessage({ type: EVENTS.payload, reportId, expiresAt, ...payload }, '*');
    };
    const receive = event => {
      if (event.source !== popup || event.data?.type !== EVENTS.ready || event.data.reportId !== reportId) return;
      ready = true;
      send();
    };
    root.addEventListener('message', receive);
    const cleanup = () => root.removeEventListener('message', receive);
    const expiration = root.setTimeout(() => {
      payload = null;
      cleanup();
      if (!popup.closed) popup.postMessage({ type: EVENTS.expired, reportId }, '*');
    }, VIEWER_LIFETIME_MS);

    return {
      deliver(html) {
        const prepared = enrich(html);
        const parsed = new DOMParser().parseFromString(prepared, 'text/html');
        payload = { html: prepared, title: parsed.title || 'Documento' };
        send();
      },
      close() {
        root.clearTimeout(expiration);
        cleanup();
        if (!popup.closed) popup.close();
      }
    };
  }

  const api = { TEMPLATE_VERSION, VIEWER_LIFETIME_MS, EVENTS, sessionMetadata, escapeHtml, fontCss, traceText, supportFooter, page, enrich, safeFilename, collectDocumentGroups, waitForDocumentAssets, downloadDocumentPages, downloadDocumentFromHtml, openViewer };
  root.CentralDocuments = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
