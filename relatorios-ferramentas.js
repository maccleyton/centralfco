'use strict';

const toolElement = id => document.getElementById(id);
let lastCompressedPdfUrl = null;

const compressionProfiles = {
  extreme: { scale: 1, maxWidth: 600, quality: 0.30, grayscale: true, label: 'Extrema' },
  high: { scale: 1, maxWidth: 900, quality: 0.50, grayscale: false, label: 'Alta' },
  medium: { scale: 1, maxWidth: 1200, quality: 0.70, grayscale: false, label: 'Média' },
  low: { scale: 1.5, maxWidth: 2000, quality: 0.90, grayscale: false, label: 'Baixa' }
};

function toolEscape(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function showToolResult(element, message, type = 'success') {
  element.className = `tool-result${type === 'error' ? ' is-error' : ''}`;
  element.textContent = message;
}

async function compressPdf(event) {
  event.preventDefault();
  const file = toolElement('pdfCompressorInput').files[0];
  const qualityKey = toolElement('pdfCompressionQuality').value;
  const profile = compressionProfiles[qualityKey];
  const button = toolElement('pdfCompressorButton');
  const progress = toolElement('pdfProgress');
  const progressBar = toolElement('pdfProgressBar');
  const progressText = toolElement('pdfProgressText');
  const result = toolElement('pdfCompressorResult');
  result.textContent = '';
  result.className = 'tool-result';
  if (!file) return;
  if (!window.pdfjsLib || !window.jspdf?.jsPDF) {
    showToolResult(result, 'As bibliotecas de compactação não foram carregadas. Verifique a conexão e tente novamente.', 'error');
    return;
  }

  button.disabled = true;
  button.textContent = 'Compactando...';
  progress.hidden = false;
  progressBar.value = 0;
  try {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    progressText.textContent = 'Analisando o PDF...';
    const fileData = new Uint8Array(await file.arrayBuffer());
    const pdf = await window.pdfjsLib.getDocument({ data: fileData }).promise;
    if (!pdf.numPages) throw new Error('O PDF não possui páginas válidas.');
    const firstPage = await pdf.getPage(1);
    const firstViewport = firstPage.getViewport({ scale: 1 });
    const firstOrientation = firstViewport.width > firstViewport.height ? 'landscape' : 'portrait';
    const compressed = new window.jspdf.jsPDF({ orientation: firstOrientation, unit: 'mm', format: 'a4', compress: true });

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      progressText.textContent = `Compactando página ${pageNumber} de ${pdf.numPages}...`;
      const page = pageNumber === 1 ? firstPage : await pdf.getPage(pageNumber);
      let viewport = page.getViewport({ scale: profile.scale });
      if (viewport.width > profile.maxWidth) {
        viewport = page.getViewport({ scale: profile.scale * (profile.maxWidth / viewport.width) });
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('O navegador não conseguiu preparar a página para compactação.');
      if (profile.grayscale) context.filter = 'grayscale(100%) contrast(125%)';
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: context, viewport }).promise;
      const image = canvas.toDataURL('image/jpeg', profile.quality);
      const orientation = viewport.width > viewport.height ? 'landscape' : 'portrait';
      if (pageNumber > 1) compressed.addPage('a4', orientation);
      const pageWidth = compressed.internal.pageSize.getWidth();
      const pageHeight = compressed.internal.pageSize.getHeight();
      const imageProperties = compressed.getImageProperties(image);
      const ratio = Math.min(pageWidth / imageProperties.width, pageHeight / imageProperties.height);
      const imageWidth = imageProperties.width * ratio;
      const imageHeight = imageProperties.height * ratio;
      compressed.addImage(image, 'JPEG', (pageWidth - imageWidth) / 2, (pageHeight - imageHeight) / 2, imageWidth, imageHeight, undefined, 'FAST');
      progressBar.value = (pageNumber / pdf.numPages) * 100;
      page.cleanup();
    }

    progressText.textContent = 'Gerando o arquivo final...';
    const blob = compressed.output('blob');
    if (lastCompressedPdfUrl) URL.revokeObjectURL(lastCompressedPdfUrl);
    lastCompressedPdfUrl = URL.createObjectURL(blob);
    const safeName = file.name.replace(/\.pdf$/i, '').replace(/[^a-z0-9._-]+/gi, '_');
    const filename = `compactado_${qualityKey}_${safeName}.pdf`;
    const download = document.createElement('a');
    download.href = lastCompressedPdfUrl;
    download.download = filename;
    document.body.append(download);
    download.click();
    download.remove();
    const difference = Math.round((1 - blob.size / file.size) * 100);
    const comparison = difference >= 0 ? `${difference}% menor` : `${Math.abs(difference)}% maior`;
    result.className = 'tool-result';
    result.innerHTML = `<strong>Compactação concluída.</strong> ${toolEscape(formatBytes(file.size))} → ${toolEscape(formatBytes(blob.size))} (${comparison}). <a href="${lastCompressedPdfUrl}" download="${toolEscape(filename)}">Baixar novamente</a>`;
  } catch (error) {
    console.error(error);
    showToolResult(result, error.message || 'Não foi possível compactar este PDF.', 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Compactar PDF';
    progress.hidden = true;
  }
}

function cleanToolCnpj(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14);
}

function formatToolCnpj(value) {
  const raw = cleanToolCnpj(value);
  if (!raw) return '';
  let result = raw.slice(0, 2);
  if (raw.length > 2) result += `.${raw.slice(2, 5)}`;
  if (raw.length > 5) result += `.${raw.slice(5, 8)}`;
  if (raw.length > 8) result += `/${raw.slice(8, 12)}`;
  if (raw.length > 12) result += `-${raw.slice(12, 14)}`;
  return result;
}

function validToolCnpj(value) {
  const raw = cleanToolCnpj(value);
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

async function requestFullCompany(cnpj) {
  return window.CnpjApi.requestSimples(cnpj);
}

function formatCompanyDate(value) {
  if (!value) return 'Não informada';
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value);
}

function formatCompanyMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Não informado';
}

function companyAddress(data) {
  const type = data.descricao_tipo_de_logradouro || data.descricao_tipo_logradouro || '';
  const street = [type, data.logradouro].filter(Boolean).join(' ');
  const first = [street, data.numero || 'S/N'].filter(Boolean).join(', ');
  const second = [data.complemento, data.bairro].filter(Boolean).join(' - ');
  const city = [data.municipio, data.uf].filter(Boolean).join('-');
  const cep = data.cep ? `CEP ${String(data.cep).replace(/\D/g, '').replace(/^(\d{2})(\d{3})(\d{3})$/, '$1.$2-$3')}` : '';
  return [first, second, city, cep].filter(Boolean).join(', ');
}

function companyDataItem(label, value, wide = false) {
  return `<div class="company-data-item${wide ? ' company-data-item--wide' : ''}"><small>${toolEscape(label)}</small><strong>${toolEscape(value || 'Não informado')}</strong></div>`;
}

function renderCompanyResult(data, consultedCnpj) {
  const result = toolElement('companyLookupResult');
  const status = data.descricao_situacao_cadastral || data.situacao || data.situacao_cadastral || 'Consultado';
  const active = String(status).toLocaleLowerCase('pt-BR').includes('ativa');
  const mainActivity = data.cnae_fiscal_descricao || data.cnae_principal?.descricao || 'Não informada';
  const mainCode = data.cnae_fiscal || data.cnae_principal?.codigo || '';
  const secondary = Array.isArray(data.cnaes_secundarios) ? data.cnaes_secundarios : [];
  const activities = [{ codigo: mainCode, descricao: mainActivity, principal: true }, ...secondary];
  const officers = Array.isArray(data.qsa) ? data.qsa : Array.isArray(data.socios) ? data.socios : [];
  const officerRows = officers.map((officer, index) => {
    const name = officer.nome_socio || officer.nome || `Integrante ${index + 1}`;
    const role = officer.qualificacao_socio || officer.descricao_qualificacao_socio || officer.codigo_qualificacao_socio || 'Não informada';
    const documentNumber = officer.cnpj_cpf_do_socio || officer.cpf_cnpj_socio || officer.documento || 'Não informado';
    const joined = formatCompanyDate(officer.data_entrada_sociedade || officer.data_entrada);
    const representative = officer.nome_representante_legal ? `<br><small>Representante: ${toolEscape(officer.nome_representante_legal)}</small>` : '';
    return `<tr><td><strong>${toolEscape(name)}</strong>${representative}</td><td>${toolEscape(role)}</td><td>${toolEscape(documentNumber)}</td><td>${toolEscape(joined)}</td></tr>`;
  }).join('');
  const phones = [data.ddd_telefone_1, data.ddd_telefone_2].filter(Boolean).join(' · ');
  const simplesStatus = data.opcao_pelo_simples === true ? 'Sim' : data.opcao_pelo_simples === false ? 'Não' : 'Não foi possível confirmar';
  const simplesDateLabel = data.opcao_pelo_simples === true ? 'Data da opção pelo Simples' : data.opcao_pelo_simples === false ? 'Última exclusão do Simples' : 'Data da situação do Simples';
  const simplesDate = data.opcao_pelo_simples === true ? formatCompanyDate(data.data_opcao_pelo_simples) : data.opcao_pelo_simples === false ? formatCompanyDate(data.data_exclusao_do_simples) : 'Não informada';

  result.innerHTML = `
    <div class="company-result__head"><div><span class="report-kicker">${toolEscape(formatToolCnpj(consultedCnpj))}</span><h3>${toolEscape(data.razao_social || data.nome || 'Empresa consultada')}</h3><p>${toolEscape(data.nome_fantasia || data.fantasia || 'Nome fantasia não informado')}</p></div><span class="company-status${active ? '' : ' is-inactive'}">${toolEscape(status)}</span></div>
    <div class="company-data-grid">
      ${companyDataItem('Natureza jurídica', data.descricao_natureza_juridica || data.natureza_juridica, true)}
      ${companyDataItem('Porte', data.porte || data.descricao_porte)}
      ${companyDataItem('Capital social', formatCompanyMoney(data.capital_social))}
      ${companyDataItem('Abertura', formatCompanyDate(data.data_inicio_atividade || data.data_abertura))}
      ${companyDataItem('Matriz/filial', data.descricao_identificador_matriz_filial || data.tipo)}
      ${companyDataItem('Fonte da consulta', data.fonte_consulta || 'BrasilAPI')}
      ${companyDataItem('Optante pelo Simples Nacional', simplesStatus)}
      ${companyDataItem(simplesDateLabel, simplesDate)}
      ${companyDataItem('Contato', [phones, data.email].filter(Boolean).join(' · '), true)}
      ${companyDataItem('Endereço', companyAddress(data), true)}
    </div>
    <section class="company-result-section"><h4>Atividades econômicas</h4><div class="company-activities">${activities.map(activity => `<span class="company-activity">${activity.principal ? '<strong>Principal · </strong>' : ''}${toolEscape([activity.codigo, activity.descricao].filter(Boolean).join(' - '))}</span>`).join('')}</div></section>
    <section class="company-result-section"><h4>Quadro societário e dirigentes (${officers.length})</h4>${officers.length ? `<table class="company-officers-table"><thead><tr><th>Nome</th><th>Qualificação</th><th>CPF/CNPJ</th><th>Entrada</th></tr></thead><tbody>${officerRows}</tbody></table>` : '<div class="company-officers-empty">A API não retornou integrantes do quadro societário para este CNPJ.</div>'}</section>`;
  result.hidden = false;
}

async function consultFullCompany(event) {
  event.preventDefault();
  const input = toolElement('companyLookupDocument');
  const cnpj = cleanToolCnpj(input.value);
  const button = toolElement('companyLookupButton');
  const message = toolElement('companyLookupMessage');
  const result = toolElement('companyLookupResult');
  message.textContent = '';
  message.className = 'tool-result';
  result.hidden = true;
  if (!validToolCnpj(cnpj)) {
    showToolResult(message, 'Confira o CNPJ e os dígitos verificadores.', 'error');
    return;
  }
  button.disabled = true;
  button.textContent = 'Consultando...';
  try {
    const data = await requestFullCompany(cnpj);
    input.value = formatToolCnpj(cnpj);
    renderCompanyResult(data, cnpj);
    const simplesText = data.opcao_pelo_simples === true ? 'A empresa é optante pelo Simples Nacional.' : data.opcao_pelo_simples === false ? 'A empresa não é optante pelo Simples Nacional.' : 'A opção pelo Simples Nacional não pôde ser confirmada.';
    showToolResult(message, `Consulta concluída via ${data.fonte_consulta || 'BrasilAPI'}. ${simplesText}`);
  } catch (error) {
    showToolResult(message, error.message || 'Não foi possível consultar este CNPJ.', 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Consultar CNPJ';
  }
}

toolElement('pdfCompressorForm').addEventListener('submit', compressPdf);
toolElement('companyLookupForm').addEventListener('submit', consultFullCompany);
toolElement('companyLookupDocument').addEventListener('input', event => {
  event.target.value = formatToolCnpj(event.target.value);
  toolElement('companyLookupMessage').textContent = '';
  toolElement('companyLookupMessage').className = 'tool-result';
  toolElement('companyLookupResult').hidden = true;
});
