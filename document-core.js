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
      employee: session.employeeName || session.nome || '',
      registration: session.employeeRegistration || session.matricula || '',
      agency: session.agency || session.agencia || ''
    };
  }

  function enrich(html) {
    const metadata = sessionMetadata();
    const marker = `<meta name="central-document-template" content="${TEMPLATE_VERSION}"><meta name="central-document-issued-at" content="${metadata.issuedAt}">`;
    return String(html).includes('</head>') ? String(html).replace('</head>', `${marker}</head>`) : String(html);
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

  const api = { TEMPLATE_VERSION, VIEWER_LIFETIME_MS, EVENTS, sessionMetadata, enrich, openViewer };
  root.CentralDocuments = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
