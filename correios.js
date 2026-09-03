'use strict';

(() => {
  const byId = id => document.getElementById(id);
  const input = byId('postalCnpj');
  if (!input) return;

  const lookupForm = byId('postalLookupForm');
  const lookupButton = byId('postalLookup');
  const generateButton = byId('postalGenerate');
  const message = byId('postalLookupMessage');
  const generateMessage = byId('postalGenerateMessage');
  const senderPreview = byId('postalSenderPreview');
  const recipientPreview = byId('postalRecipientPreview');
  const manualForm = byId('postalManualForm');
  let recipient = null;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  }

  function cleanCnpj(value) {
    return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14);
  }

  function formatCnpj(value) {
    const raw = cleanCnpj(value);
    if (!raw) return '';
    let result = raw.slice(0, 2);
    if (raw.length > 2) result += `.${raw.slice(2, 5)}`;
    if (raw.length > 5) result += `.${raw.slice(5, 8)}`;
    if (raw.length > 8) result += `/${raw.slice(8, 12)}`;
    if (raw.length > 12) result += `-${raw.slice(12, 14)}`;
    return result;
  }

  function validCnpj(value) {
    const raw = cleanCnpj(value);
    if (!/^[A-Z0-9]{12}\d{2}$/.test(raw) || /^(\d)\1{13}$/.test(raw)) return false;
    const characterValue = character => character.charCodeAt(0) - 48;
    const digit = (base, weights) => {
      const sum = [...base].reduce((total, character, index) => total + characterValue(character) * weights[index], 0);
      const remainder = sum % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };
    const base = raw.slice(0, 12);
    const first = digit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const second = digit(base + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return raw.slice(12) === `${first}${second}`;
  }

  function formatCep(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
    return digits.replace(/^(\d{2})(\d{3})(\d{3})$/, '$1.$2-$3');
  }

  function agencyName(value) {
    return String(value || '').split('-').map(part => {
      const text = part.trim();
      if (text.length === 2) return text.toUpperCase();
      return text.toLocaleLowerCase('pt-BR').replace(/(^|\s)\p{L}/gu, letter => letter.toLocaleUpperCase('pt-BR'));
    }).join('-');
  }

  function selectedAgency() {
    try {
      const saved = JSON.parse(sessionStorage.getItem('centralFcoSessionV1') || 'null');
      if (saved?.agencia?.prefixo) return saved.agencia;
    } catch (_) {
      // Usa a agência padrão quando a sessão não está disponível.
    }
    return (window.FCO_AGENCIES || []).find(agency => String(agency.prefixo) === '1031') || null;
  }

  function senderData() {
    const agency = selectedAgency();
    if (!agency) return null;
    return {
      name: 'Banco do Brasil S.A.',
      address: agency.endereco || '',
      complement: `Agência ${agency.prefixo} - ${agencyName(agency.nome)}`,
      district: agency.bairro || '',
      city: agency.municipio || '',
      state: agency.uf || '',
      zip: formatCep(agency.cep)
    };
  }

  function companyData(data, cnpj) {
    const streetType = data.descricao_tipo_de_logradouro || data.descricao_tipo_logradouro || '';
    const rawStreet = String(data.logradouro || '').trim();
    const streetAlreadyTyped = streetType && new RegExp(`(^|\\s)${String(streetType).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`, 'i').test(rawStreet);
    return {
      cnpj: formatCnpj(cnpj),
      name: data.razao_social || data.nome || '',
      address: streetAlreadyTyped ? rawStreet : [streetType, rawStreet].filter(Boolean).join(' ').trim(),
      number: data.numero || 'S/N',
      complement: data.complemento || '',
      district: data.bairro || '',
      city: data.municipio || '',
      state: data.uf || '',
      zip: formatCep(data.cep)
    };
  }

  function addressLines(party, includeDocument = false) {
    const firstLine = party.number ? `${party.address}, ${party.number}` : party.address;
    const location = `${party.zip} - ${party.city}-${party.state}`;
    return [
      `<strong>${escapeHtml(party.name)}</strong>`,
      includeDocument ? `<span>CNPJ ${escapeHtml(party.cnpj)}</span>` : '',
      `<span>${escapeHtml(firstLine)}</span>`,
      party.complement ? `<span>${escapeHtml(party.complement)}</span>` : '',
      party.district ? `<span>${escapeHtml(party.district)}</span>` : '',
      `<span>${escapeHtml(location)}</span>`
    ].filter(Boolean).join('');
  }

  function setMessage(text, type = '') {
    message.textContent = text;
    message.className = `inline-message${type ? ` is-${type}` : ''}`;
  }

  function setGenerateMessage(text, type = '') {
    generateMessage.textContent = text;
    generateMessage.className = `inline-message${type ? ` is-${type}` : ''}`;
  }

  function renderSender() {
    const sender = senderData();
    senderPreview.innerHTML = sender ? addressLines(sender) : 'Não foi possível identificar a agência da sessão.';
    return sender;
  }

  function validateRecipient(data) {
    const missing = [];
    if (!data.name) missing.push('razão social');
    if (!data.address) missing.push('logradouro');
    if (!data.district) missing.push('bairro');
    if (!data.city) missing.push('município');
    if (!data.state) missing.push('UF');
    if (!/^\d{2}\.\d{3}-\d{3}$/.test(data.zip)) missing.push('CEP');
    return missing;
  }

  function setManualValue(id, value) {
    const field = byId(id);
    if (field) field.value = value || '';
  }

  function showManualForm(data, cnpj) {
    const base = data || {};
    setManualValue('postalManualName', base.name);
    setManualValue('postalManualStreet', base.address);
    setManualValue('postalManualNumber', base.number === 'S/N' ? '' : base.number);
    setManualValue('postalManualComplement', base.complement);
    setManualValue('postalManualDistrict', base.district);
    setManualValue('postalManualZip', base.zip);
    setManualValue('postalManualCity', base.city);
    setManualValue('postalManualState', base.state);
    manualForm.dataset.cnpj = cnpj;
    manualForm.hidden = false;
  }

  function hideManualForm() {
    manualForm.hidden = true;
    manualForm.dataset.cnpj = '';
  }

  async function consultRecipient(event) {
    event.preventDefault();
    const cnpj = cleanCnpj(input.value);
    recipient = null;
    generateButton.disabled = true;
    recipientPreview.hidden = true;
    hideManualForm();
    setMessage('');
    if (!validCnpj(cnpj)) return setMessage('Confira o CNPJ e os dígitos verificadores.', 'error');
    if (!window.CnpjApi?.request) return setMessage('O serviço de consulta de CNPJ não foi carregado.', 'error');

    lookupButton.disabled = true;
    lookupButton.textContent = 'Consultando...';
    try {
      const data = await window.CnpjApi.request(cnpj);
      const normalized = companyData(data, cnpj);
      const missing = validateRecipient(normalized);
      input.value = formatCnpj(cnpj);
      if (missing.length) {
        showManualForm(normalized, cnpj);
        setMessage(`A consulta não retornou ${missing.join(', ')}. Complete o endereço manualmente para continuar.`, 'warning');
        return;
      }
      recipient = normalized;
      recipientPreview.innerHTML = addressLines(recipient, true);
      recipientPreview.hidden = false;
      generateButton.disabled = !renderSender();
      setMessage(`Dados obtidos automaticamente via ${data.fonte_consulta || 'consulta cadastral'}.`, 'success');
    } catch (error) {
      input.value = formatCnpj(cnpj);
      showManualForm({ cnpj: formatCnpj(cnpj), number: 'S/N' }, cnpj);
      setMessage(`${error.message || 'Não foi possível consultar os dados deste CNPJ.'} Preencha os dados manualmente para continuar.`, 'warning');
    } finally {
      lookupButton.disabled = false;
      lookupButton.textContent = 'Consultar';
    }
  }

  function useManualRecipient(event) {
    event.preventDefault();
    const cnpj = manualForm.dataset.cnpj || cleanCnpj(input.value);
    const normalized = {
      cnpj: formatCnpj(cnpj),
      name: byId('postalManualName').value.trim(),
      address: byId('postalManualStreet').value.trim(),
      number: byId('postalManualNumber').value.trim() || 'S/N',
      complement: byId('postalManualComplement').value.trim(),
      district: byId('postalManualDistrict').value.trim(),
      zip: formatCep(byId('postalManualZip').value),
      city: byId('postalManualCity').value.trim(),
      state: byId('postalManualState').value.trim().toUpperCase()
    };
    const missing = validateRecipient(normalized);
    if (missing.length) return setMessage(`Preencha corretamente: ${missing.join(', ')}.`, 'error');
    recipient = normalized;
    recipientPreview.innerHTML = addressLines(recipient, true);
    recipientPreview.hidden = false;
    hideManualForm();
    generateButton.disabled = !renderSender();
    setMessage('Endereço de contingência confirmado. Confira os dados antes de gerar.', 'success');
  }

  function postalHtml(sender, target, logo, neighborAuthorized) {
    const destinationAddress = `${target.address}, ${target.number}${target.complement ? ` - ${target.complement}` : ''}`;
    const returnLocation = `${sender.zip} - ${sender.city}-${sender.state}`;
    const destinationLocation = `${target.zip} - ${target.city}-${target.state}`;
    const neighborText = neighborAuthorized ? 'Entrega no vizinho autorizada' : 'Entrega no vizinho não autorizada';
    const neighborMarks = neighborAuthorized ? '☒ SIM &nbsp;&nbsp; ☐ NÃO' : '☐ SIM &nbsp;&nbsp; ☒ NÃO';
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>AR e Etiqueta - ${escapeHtml(target.name)}</title><style>
      @page{size:A4 landscape;margin:0}*{box-sizing:border-box}body{margin:0;background:#e8eaf0;color:#111;font-family:Arial,sans-serif}.toolbar{position:sticky;top:0;z-index:5;display:flex;justify-content:space-between;align-items:center;padding:12px 22px;background:#20206f;color:#fff}.toolbar button{border:0;border-radius:8px;padding:11px 18px;background:#fcfc30;color:#20206f;font-weight:700;cursor:pointer}.page{width:297mm;min-height:210mm;margin:10mm auto;padding:8mm;background:#fff;box-shadow:0 5px 24px #0002;display:grid;grid-template-columns:157mm 118mm;gap:6mm;align-items:start}.postal-logo{width:35mm;height:12mm;object-fit:contain}.ar{height:194mm;border:1.2pt solid #111;font-size:7.3pt;display:grid;grid-template-columns:9mm minmax(0,1fr)}.glue-strip{border-right:1pt dashed #333;background:repeating-linear-gradient(135deg,#fff7a8 0 4mm,#fff 4mm 8mm);writing-mode:vertical-rl;transform:rotate(180deg);display:grid;place-items:center;padding:2mm 1mm;text-align:center;font-weight:700;letter-spacing:.08em}.ar-content{min-width:0}.ar-header{display:grid;grid-template-columns:38mm 1fr 16mm;align-items:center;border-bottom:1pt solid #111;height:17mm}.ar-header>div{padding:2mm}.ar-header strong{font-size:16pt}.ar-main{display:grid;grid-template-columns:1fr 39mm;height:87mm}.ar-addresses{padding:3mm;border-right:1pt solid #111}.ar-addresses h2{margin:0 0 1mm;font-size:7pt}.ar-addresses p{margin:0 0 3mm;line-height:1.2}.tracking{margin:4mm auto;padding:2.5mm;border:1pt dashed #333;text-align:center;font-size:6.5pt}.postal-boxes{display:grid;grid-template-rows:repeat(3,1fr)}.postal-boxes div{padding:2mm;border-bottom:1pt solid #111;text-align:center;font-size:6.5pt}.postal-boxes div:last-child{border-bottom:0}.ar-delivery{display:grid;grid-template-columns:1fr 1.25fr;border-top:1pt solid #111;height:48mm}.ar-delivery>section{padding:2.5mm}.ar-delivery>section:first-child{border-right:1pt solid #111}.ar-delivery h3{margin:0 0 2mm;text-align:center;font-size:7pt}.ar-delivery p{margin:2mm 0;line-height:1.25}.attempt{display:grid;grid-template-columns:8mm 1fr 23mm;gap:1mm;margin:2mm 0;border-bottom:1pt solid #444;padding-bottom:1mm}.receiver{border-top:1pt solid #111;padding:2.5mm;height:41mm}.receiver div{margin-top:7mm;border-bottom:1pt solid #111}.label-column{height:194mm;display:flex;flex-direction:column}.label{border:1.2pt solid #111;font-size:8pt}.label-exclusive{height:45mm;padding:16mm 6mm 0;text-align:center;border-bottom:1pt solid #111}.label-exclusive strong{display:block;font-size:11pt}.label-receiver{height:24mm;padding:3mm;border-bottom:1pt solid #111}.label-receiver div{margin-top:5mm;border-bottom:1pt solid #111}.label-neighbor{min-height:17mm;padding:2mm 3mm;border-bottom:1pt solid #111}.label-neighbor strong{display:block;margin-bottom:1mm;padding:1mm;background:#111;color:#fff}.neighbor-marks{float:right;font-weight:700}.label-destination{padding:3mm}.label-destination__head{display:flex;align-items:center;justify-content:space-between;margin-bottom:2mm}.label-destination__head strong{font-size:11pt}.label-destination__head img{width:24mm;height:7mm;object-fit:contain}.label-destination p,.label-sender p{margin:0;line-height:1.3}.label-code{height:25mm;margin-top:4mm;border:1pt dashed #777;display:grid;place-items:center;text-align:center;color:#555;font-size:7pt}.label-sender{margin-top:3mm;padding:3mm;border:1pt solid #aaa;font-size:8pt}.document-note{margin:3mm 1mm 0;color:#555;font-size:6.5pt;text-align:center}@media print{body{background:#fff}.toolbar{display:none}.page{margin:0;box-shadow:none}}
      .page{align-items:center}.postal-logo{height:10mm}.ar{height:115mm;font-size:7.1pt}.ar-header{height:15mm}.ar-header>div{padding:1.5mm 2mm}.ar-header strong{font-size:15pt}.ar-main{height:48mm}.ar-addresses{padding:2mm 3mm}.ar-addresses h2{margin-bottom:.7mm;font-size:6.8pt}.ar-addresses p{margin-bottom:1.5mm;line-height:1.15}.tracking{margin:2mm auto;padding:1.5mm;font-size:6.2pt}.postal-boxes div{padding:1.5mm;font-size:6.2pt}.ar-delivery{height:30mm}.ar-delivery>section{padding:1.5mm 2mm}.ar-delivery h3{margin-bottom:1mm;font-size:6.5pt}.ar-delivery p{margin:1mm 0;line-height:1.15}.attempt{grid-template-columns:8mm 1fr 20mm;margin:1mm 0;padding-bottom:.5mm}.return-reasons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8mm 2mm}.return-reason{display:grid;grid-template-columns:3mm 1fr;align-items:center;gap:.6mm;white-space:nowrap}.return-box{font-size:8pt;line-height:1;text-align:center}.courier-signature{display:grid;grid-template-columns:max-content 1fr;align-items:end;gap:1mm;margin-top:1.5mm}.courier-signature__line{height:3mm;border-bottom:1pt solid #444}.receiver{height:20mm;padding:1.5mm 2.5mm}.receiver div{margin-top:3mm}.label-column{height:auto;min-height:145mm;justify-content:center}.label-exclusive{height:34mm;padding:10mm 6mm 0}.label-receiver{height:18mm;padding:2mm 3mm}.label-receiver div{margin-top:3mm}.label-neighbor{min-height:14mm;padding:1.5mm 3mm}.label-destination{padding:2.5mm 3mm}.label-destination__head{margin-bottom:1.5mm}.label-destination p,.label-sender p{line-height:1.25}.label-code{height:20mm;margin-top:3mm}.label-sender{margin-top:2mm;padding:2.5mm 3mm}.document-note{margin-top:2mm}
    </style></head><body>
      <main class="page"><section class="ar"><aside class="glue-strip">ÁREA DE COLAGEM NO VERSO · APLICAR ADESIVO NESTA FAIXA</aside><div class="ar-content">
        <header class="ar-header"><div><img class="postal-logo" src="${logo}" alt="Correios"></div><div><b>AVISO DE RECEBIMENTO</b></div><div><strong>AR</strong></div></header>
        <div class="ar-main"><section class="ar-addresses"><h2>DESTINATÁRIO</h2><p><b>${escapeHtml(target.name)}</b><br>${escapeHtml(destinationAddress)}<br>${escapeHtml(target.district)}<br>${escapeHtml(destinationLocation)}</p><div class="tracking">COLE AQUI A ETIQUETA COM O CÓDIGO DE REGISTRO DO OBJETO</div><h2>ENDEREÇO PARA DEVOLUÇÃO DO AR</h2><p><b>${escapeHtml(sender.name)}</b><br>${escapeHtml(sender.address)}<br>${escapeHtml(sender.complement)}<br>${escapeHtml(sender.district)}<br>${escapeHtml(returnLocation)}</p></section><aside class="postal-boxes"><div>DATA DE POSTAGEM</div><div>UNIDADE DE POSTAGEM</div><div>CARIMBO<br>UNIDADE DE ENTREGA</div></aside></div>
        <div class="ar-delivery"><section><h3>TENTATIVAS DE ENTREGA</h3><div class="attempt"><b>1ª</b><span>____/____/____</span><span>____:____ h</span></div><div class="attempt"><b>2ª</b><span>____/____/____</span><span>____:____ h</span></div><div class="attempt"><b>3ª</b><span>____/____/____</span><span>____:____ h</span></div></section><section><h3>OBSERVAÇÃO / MOTIVO DE DEVOLUÇÃO</h3><div class="return-reasons"><span class="return-reason"><b class="return-box">□</b><span>Mudou-se</span></span><span class="return-reason"><b class="return-box">□</b><span>Recusado</span></span><span class="return-reason"><b class="return-box">□</b><span>Endereço insuficiente</span></span><span class="return-reason"><b class="return-box">□</b><span>Não procurado</span></span><span class="return-reason"><b class="return-box">□</b><span>Ausente</span></span><span class="return-reason"><b class="return-box">□</b><span>Falecido</span></span><span class="return-reason"><b class="return-box">□</b><span>Outros</span></span></div><div class="courier-signature"><span>RUBRICA E MATRÍCULA DO CARTEIRO:</span><span class="courier-signature__line"></span></div></section></div>
        <div class="receiver">ASSINATURA DO RECEBEDOR<div></div><br>NOME LEGÍVEL DO RECEBEDOR &nbsp;&nbsp;&nbsp;&nbsp; Nº DO DOCUMENTO DE IDENTIDADE</div>
      </div></section><section class="label-column"><div class="label"><div class="label-exclusive"><strong>USO EXCLUSIVO DOS CORREIOS</strong><span>Cole aqui a etiqueta oficial com o código identificador da encomenda</span></div><div class="label-receiver">Recebedor:<div></div><br>Assinatura: __________________________ &nbsp; Documento: __________________</div><div class="label-neighbor"><strong>ENTREGA NO VIZINHO AUTORIZADA?</strong><span>${escapeHtml(neighborText)}</span><span class="neighbor-marks">${neighborMarks}</span></div><div class="label-destination"><div class="label-destination__head"><strong>DESTINATÁRIO</strong><img src="${logo}" alt="Correios"></div><p><b>${escapeHtml(target.name)}</b><br>${escapeHtml(destinationAddress)}<br>${escapeHtml(target.district)}<br><b>${escapeHtml(target.zip)}</b> &nbsp;&nbsp; ${escapeHtml(target.city)}-${escapeHtml(target.state)}</p><div class="label-code">ESPAÇO RESERVADO AO CÓDIGO DE REGISTRO / RASTREIO OFICIAL</div></div></div><section class="label-sender"><p><b>Remetente: ${escapeHtml(sender.name)}</b><br>${escapeHtml(sender.address)}<br>${escapeHtml(sender.complement)}<br>${escapeHtml(sender.district)}<br><b>${escapeHtml(sender.zip)}</b> &nbsp;&nbsp; ${escapeHtml(sender.city)}-${escapeHtml(sender.state)}</p></section><p class="document-note">O código de registro e o código de barras devem ser aplicados pelos Correios no momento da postagem.</p></section></main>
    </body></html>`;
  }

  function generatePostalDocuments() {
    const sender = senderData();
    setGenerateMessage('');
    if (!sender || !recipient) return setGenerateMessage('Consulte um CNPJ válido antes de gerar.', 'error');
    try {
      const logo = window.CORREIOS_LOGO_DATA_URL;
      if (!logo) throw new Error('A identidade visual dos Correios não foi carregada. Atualize a página e tente novamente.');
      const neighborAuthorized = Boolean(byId('postalNeighborAuthorization')?.checked);
      const viewer = window.CentralDocuments?.openViewer();
      if (!viewer) throw new Error('O navegador bloqueou a abertura do documento. Permita pop-ups e tente novamente.');
      viewer.deliver(postalHtml(sender, recipient, logo, neighborAuthorized));
    } catch (error) {
      setGenerateMessage(error.message || 'Não foi possível gerar o AR e a etiqueta.', 'error');
    }
  }

  input.addEventListener('input', event => {
    event.target.value = formatCnpj(event.target.value);
    recipient = null;
    recipientPreview.hidden = true;
    hideManualForm();
    generateButton.disabled = true;
    setMessage('');
    setGenerateMessage('');
  });
  lookupForm.addEventListener('submit', consultRecipient);
  manualForm.addEventListener('submit', useManualRecipient);
  byId('postalManualZip').addEventListener('input', event => { event.target.value = formatCep(event.target.value); });
  byId('postalManualState').addEventListener('input', event => { event.target.value = event.target.value.replace(/[^a-z]/gi, '').toUpperCase().slice(0, 2); });
  generateButton.addEventListener('click', generatePostalDocuments);
  renderSender();
})();
