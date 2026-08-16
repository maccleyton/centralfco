const deadlineRules = [
  ['Giro Dissociado','FCO Mulher Empreendedora / FCO Pantanal e Cerrado / FCO Quilombo','MEI',18,48],
  ['Giro Dissociado','FCO Mulher Empreendedora / FCO Pantanal e Cerrado / FCO Quilombo','MPE',18,48],
  ['Giro Dissociado','Desenvolvimento Industrial','MEI',6,24],
  ['Giro Dissociado','Desenvolvimento Industrial','DEMAIS PORTES',6,48],
  ['Giro Dissociado','Turismo Regional, Comercial e Serviços','MEI',6,24],
  ['Giro Dissociado','Turismo Regional, Comercial e Serviços','DEMAIS PORTES',6,24],
  ['Giro Dissociado','Infraestrutura Econômica e Ciência, Tecnologia e Inovação','TODOS',6,24],
  ['Desenvolvimento Industrial','FCO Mulher Empreendedora / FCO Pantanal e Cerrado / FCO Quilombo','MEI',15,72],
  ['Desenvolvimento Industrial','FCO Mulher Empreendedora / FCO Pantanal e Cerrado / FCO Quilombo','MPE',48,168],
  ['Desenvolvimento Industrial','FCO Mulher Empreendedora / FCO Pantanal e Cerrado / FCO Quilombo','MGE',null,null],
  ['Desenvolvimento Industrial','Investimento e Capital de Giro Associado','MEI',3,48],
  ['Desenvolvimento Industrial','Investimento e Capital de Giro Associado','MPE',36,144],
  ['Desenvolvimento Industrial','Investimento e Capital de Giro Associado','MGE',36,144],
  ['Desenvolvimento Industrial','Caminhões (novos ou usados)','MEI',24,120],
  ['Desenvolvimento Industrial','Caminhões (novos ou usados)','MPE',24,120],
  ['Desenvolvimento Industrial','Caminhões (novos ou usados)','MGE',24,120],
  ['Infraestrutura Econômica','FCO Mulher Empreendedora / FCO Pantanal e Cerrado / FCO Quilombo','MEI',null,null],
  ['Infraestrutura Econômica','FCO Mulher Empreendedora / FCO Pantanal e Cerrado / FCO Quilombo','MPE',72,204],
  ['Infraestrutura Econômica','FCO Mulher Empreendedora / FCO Pantanal e Cerrado / FCO Quilombo','MGE',null,null],
  ['Infraestrutura Econômica','Investimento e Capital de Giro Associado','MEI',null,null],
  ['Infraestrutura Econômica','Investimento e Capital de Giro Associado','MPE',60,180],
  ['Infraestrutura Econômica','Investimento e Capital de Giro Associado','MGE',60,180],
  ['Infraestrutura Econômica','Caminhões (novos ou usados)','MEI',null,null],
  ['Infraestrutura Econômica','Caminhões (novos ou usados)','MPE',24,120],
  ['Infraestrutura Econômica','Caminhões (novos ou usados)','MGE',24,120],
  ['Desenvolvimento do Turismo Regional','FCO Mulher Empreendedora / FCO Pantanal e Cerrado / FCO Quilombo','MEI',15,60],
  ['Desenvolvimento do Turismo Regional','FCO Mulher Empreendedora / FCO Pantanal e Cerrado / FCO Quilombo','MPE',48,168],
  ['Desenvolvimento do Turismo Regional','FCO Mulher Empreendedora / FCO Pantanal e Cerrado / FCO Quilombo','MGE',null,null],
  ['Desenvolvimento do Turismo Regional','Investimento e Capital de Giro Associado','MEI',3,36],
  ['Desenvolvimento do Turismo Regional','Investimento e Capital de Giro Associado','MPE',36,144],
  ['Desenvolvimento do Turismo Regional','Investimento e Capital de Giro Associado','MGE',36,144],
  ['Desenvolvimento do Turismo Regional','Caminhões (novos ou usados)','MEI',24,120],
  ['Desenvolvimento do Turismo Regional','Caminhões (novos ou usados)','MPE',24,120],
  ['Desenvolvimento do Turismo Regional','Caminhões (novos ou usados)','MGE',24,120],
  ['Desenvolvimento dos Setores Comercial e de Serviços','FCO Mulher Empreendedora / FCO Pantanal e Cerrado / FCO Quilombo','MEI',15,60],
  ['Desenvolvimento dos Setores Comercial e de Serviços','FCO Mulher Empreendedora / FCO Pantanal e Cerrado / FCO Quilombo','MPE',48,168],
  ['Desenvolvimento dos Setores Comercial e de Serviços','FCO Mulher Empreendedora / FCO Pantanal e Cerrado / FCO Quilombo','MGE',null,null],
  ['Desenvolvimento dos Setores Comercial e de Serviços','Investimento e Capital de Giro Associado','MEI',3,36],
  ['Desenvolvimento dos Setores Comercial e de Serviços','Investimento e Capital de Giro Associado','MPE',36,144],
  ['Desenvolvimento dos Setores Comercial e de Serviços','Investimento e Capital de Giro Associado','MGE',36,144],
  ['Desenvolvimento dos Setores Comercial e de Serviços','Caminhões (novos ou usados)','MEI',24,120],
  ['Desenvolvimento dos Setores Comercial e de Serviços','Caminhões (novos ou usados)','MPE',24,120],
  ['Desenvolvimento dos Setores Comercial e de Serviços','Caminhões (novos ou usados)','MGE',24,120],
  ['Ciência, Tecnologia e Inovação','FCO Mulher Empreendedora / FCO Pantanal e Cerrado / FCO Quilombo','MEI',72,204],
  ['Ciência, Tecnologia e Inovação','FCO Mulher Empreendedora / FCO Pantanal e Cerrado / FCO Quilombo','MPE',72,204],
  ['Ciência, Tecnologia e Inovação','FCO Mulher Empreendedora / FCO Pantanal e Cerrado / FCO Quilombo','MGE',null,null],
  ['Ciência, Tecnologia e Inovação','Investimento e Capital de Giro Associado','MEI',60,180],
  ['Ciência, Tecnologia e Inovação','Investimento e Capital de Giro Associado','MPE',60,180],
  ['Ciência, Tecnologia e Inovação','Investimento e Capital de Giro Associado','MGE',60,180]
];

const lineFilter = document.querySelector('#lineFilter');
const purposeFilter = document.querySelector('#purposeFilter');
const sizeFilter = document.querySelector('#sizeFilter');
const tableBody = document.querySelector('#deadlineTableBody');
const emptyState = document.querySelector('#deadlineEmpty');

function addOptions(select, values) {
  values.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

function renderTable() {
  const rules = deadlineRules.filter(([line, purpose, size]) =>
    (lineFilter.value === 'all' || line === lineFilter.value) &&
    (purposeFilter.value === 'all' || purpose === purposeFilter.value) &&
    (sizeFilter.value === 'all' || size === sizeFilter.value)
  );

  tableBody.replaceChildren(...rules.map(([line, purpose, size, grace, total]) => {
    const row = document.createElement('tr');
    [line, purpose, size, grace === null ? '—' : `até ${grace} meses`, total === null ? '—' : `até ${total} meses`].forEach((value, index) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      if (index === 2) cell.innerHTML = `<span class="size-badge">${value}</span>`;
      row.append(cell);
    });
    return row;
  }));

  emptyState.hidden = rules.length > 0;
  document.querySelector('.deadline-table').hidden = rules.length === 0;
}

addOptions(lineFilter, [...new Set(deadlineRules.map(rule => rule[0]))]);
addOptions(purposeFilter, [...new Set(deadlineRules.map(rule => rule[1]))]);
[lineFilter, purposeFilter, sizeFilter].forEach(filter => filter.addEventListener('change', renderTable));
renderTable();

const formState = { nif: null, scr: null };
const byId = id => document.getElementById(id);
const reportsSource = new URLSearchParams(window.location.search).get('from');

if (reportsSource === 'web') {
  byId('reportsBackBrand').href = 'index.html';
  byId('reportsBackLink').href = 'index.html';
}

function returnToCentral(event) {
  event.preventDefault();
  if ((reportsSource === 'web' || reportsSource === 'local') && history.length > 1) {
    history.back();
    return;
  }
  window.location.href = event.currentTarget.href;
}

byId('reportsBackBrand').addEventListener('click', returnToCentral);
byId('reportsBackLink').addEventListener('click', returnToCentral);

function escapeReportHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function cleanCnpj(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14);
}

function formatCpf(value) {
  return onlyDigits(value).slice(0, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
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

function validCpf(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calculate = length => {
    const sum = cpf.slice(0, length).split('').reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return calculate(9) === Number(cpf[9]) && calculate(10) === Number(cpf[10]);
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
  const raw = onlyDigits(value).slice(0, 8);
  return raw.length === 8 ? `${raw.slice(0, 2)}.${raw.slice(2, 5)}-${raw.slice(5)}` : raw;
}

function formatAddress(data) {
  const streetType = data.descricao_tipo_de_logradouro || data.descricao_tipo_logradouro || '';
  const street = [streetType, data.logradouro].filter(Boolean).join(' ').trim();
  const first = [street, data.numero || 'S/N'].filter(Boolean).join(', ');
  const second = [data.complemento, data.bairro].filter(Boolean).join(' - ');
  const city = [data.municipio, data.uf].filter(Boolean).join('-');
  return [first, second, city, data.cep && `CEP ${formatCep(data.cep)}`].filter(Boolean).join(', ');
}

function setFormMessage(id, text = '', type = '') {
  const element = byId(id);
  element.textContent = text;
  element.className = text ? `inline-message is-${type}` : 'inline-message';
}

function setLookupLoading(prefix, loading) {
  const button = byId(`${prefix}Lookup`);
  button.disabled = loading;
  button.textContent = loading ? 'Consultando...' : 'Consultar CNPJ';
}

function syncPersonType(prefix, reset = true) {
  const isCompany = byId(`${prefix}PersonType`).value === 'pj';
  const documentInput = byId(`${prefix}Document`);
  const nameInput = byId(`${prefix}Name`);
  byId(`${prefix}DocumentLabel`).textContent = isCompany ? 'CNPJ' : 'CPF';
  byId(`${prefix}NameLabel`).textContent = isCompany ? 'Razão social' : 'Nome completo';
  documentInput.placeholder = isCompany ? '00.000.000/0000-00' : '000.000.000-00';
  documentInput.inputMode = isCompany ? 'text' : 'numeric';
  byId(`${prefix}Lookup`).hidden = !isCompany;
  nameInput.readOnly = isCompany;
  if (prefix === 'nif') {
    byId('nifAddress').readOnly = isCompany;
    byId('nifBirthField').hidden = isCompany;
    byId('nifBirthCountryField').hidden = isCompany;
    byId('nifSignerField').hidden = isCompany;
    byId('nifBirthDate').required = !isCompany;
    byId('nifBirthCountry').required = !isCompany;
    byId('nifSigner').required = !isCompany;
    byId('nifDocumentHint').textContent = isCompany ? 'Consulte o CNPJ para preencher razão social e endereço.' : 'O CPF será usado como NIF brasileiro.';
  }
  if (reset) {
    formState[prefix] = null;
    documentInput.value = '';
    nameInput.value = '';
    if (prefix === 'nif') {
      byId('nifAddress').value = '';
      byId('nifTaxNumber1').value = '';
      byId('nifSigner').value = '';
    }
    setFormMessage(`${prefix}LookupMessage`);
  }
}

async function requestCompany(cnpj) {
  return window.CnpjApi.request(cnpj);
}

async function lookupCompanyForForm(prefix) {
  const documentInput = byId(`${prefix}Document`);
  const cnpj = cleanCnpj(documentInput.value);
  setFormMessage(`${prefix}LookupMessage`);
  if (!validCnpj(cnpj)) {
    setFormMessage(`${prefix}LookupMessage`, 'Confira o CNPJ e os dígitos verificadores.', 'error');
    return;
  }
  setLookupLoading(prefix, true);
  try {
    const data = await requestCompany(cnpj);
    const company = {
      document: cnpj,
      name: data.razao_social || data.nome || '',
      address: formatAddress(data)
    };
    formState[prefix] = company;
    documentInput.value = formatCnpj(cnpj);
    byId(`${prefix}Name`).value = company.name;
    if (prefix === 'nif') {
      byId('nifAddress').value = company.address;
      byId('nifTaxNumber1').value = formatCnpj(cnpj);
    }
    setFormMessage(`${prefix}LookupMessage`, 'Dados da empresa carregados. Confira antes de gerar o documento.', 'success');
  } catch (error) {
    formState[prefix] = null;
    setFormMessage(`${prefix}LookupMessage`, error.message || 'Não foi possível consultar o CNPJ.', 'error');
  } finally {
    setLookupLoading(prefix, false);
  }
}

function dateInPortuguese(value) {
  if (!value) return '';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR').format(new Date(year, month - 1, day));
}

let reportLogoSource = 'logo02.png';
const reportLogoReady = (async () => {
  try {
    const response = await fetch(new URL('logo02.png', window.location.href));
    if (!response.ok) throw new Error('Logo não encontrada.');
    const blob = await response.blob();
    reportLogoSource = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (_) {
    reportLogoSource = new URL('logo02.png', window.location.href).href;
  }
})();

function reportHeader(label) {
  return `<header class="brand"><img src="${escapeReportHtml(reportLogoSource)}" alt="Banco do Brasil"><span>${escapeReportHtml(label)}</span></header>`;
}

function standardReportFooter() {
  return `<footer class="footer">CRBB: 4004-0001 (capitais e regiões metropolitanas) ou 0800 729 0001 (demais localidades).<br>SAC: 0800 729 0722 · Atendimento para Pessoas com Deficiência Auditiva ou de Fala: 0800 729 0088 · Ouvidoria BB: 0800 729 5678.</footer>`;
}

function reportShell(title, body) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeReportHtml(title)}</title><style>
  @page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#eef0f7;color:#20213a;font-family:Arial,sans-serif;line-height:1.45}.page{position:relative;width:210mm;min-height:297mm;margin:20px auto;padding:13mm 18mm 27mm;background:#fff;box-shadow:0 12px 40px #1d1e3b26}.brand{height:18mm;display:flex;align-items:center;justify-content:space-between;gap:6mm;margin-bottom:6mm;padding-bottom:2.5mm;border-bottom:1.5pt solid #2037a0}.brand img{width:22mm;height:12mm;object-fit:contain}.brand span{color:#555;font-size:7.5pt;text-transform:uppercase;letter-spacing:.12em}.title{margin:18px 0 20px}.title small{color:#3333bd;font-weight:700;letter-spacing:.1em}.title h1{margin:5px 0 0;font-size:26px;line-height:1.1}.data-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0}.data{padding:10px 12px;border:1px solid #d9dcea;border-radius:8px}.data.wide{grid-column:1/-1}.data small,.signature small{display:block;color:#707387;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em}.data strong{display:block;margin-top:3px;font-size:12px}.copy{font-size:11px;text-align:justify}.copy h2{margin:22px 0 8px;color:#3333bd;font-size:14px}.copy li{margin-bottom:5px}.tax-table{width:100%;margin:13px 0 20px;border-collapse:collapse;font-size:11px}.tax-table th,.tax-table td{padding:9px;border:1px solid #cfd3e2;text-align:left}.tax-table th{background:#ededff;color:#3333bd}.signature{margin-top:42px;padding-top:30px;border-top:1px solid #777;text-align:center}.signature strong{font-size:12px}.footer{position:absolute;left:18mm;right:18mm;bottom:10mm;padding-top:2.5mm;border-top:.6pt solid #aaa;color:#333;font-size:7.5pt;line-height:1.25}.print{position:fixed;right:22px;bottom:22px;padding:12px 18px;border:0;border-radius:8px;background:#3333bd;color:#fff;font-weight:700;cursor:pointer}@media print{body{background:#fff}.page{margin:0;box-shadow:none}.print{display:none}}@media(max-width:800px){.page{width:100%;min-height:100vh;margin:0;padding:24px 18px 100px}.brand{height:auto}.brand img{width:64px;height:40px}.footer{left:18px;right:18px;bottom:20px}.data-grid{grid-template-columns:1fr}.data.wide{grid-column:auto}.print{right:12px;bottom:12px}}
  .signature{margin-top:18mm;padding-top:4mm;break-inside:avoid;page-break-inside:avoid}
  @media print{html,body{width:210mm;height:297mm}body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{width:210mm;height:297mm;min-height:297mm;max-height:297mm;margin:0;padding:13mm 18mm 27mm;overflow:hidden;box-shadow:none}.brand,.title,.data-grid,.tax-table,.signature{break-inside:avoid;page-break-inside:avoid}.data-grid{grid-template-columns:1fr 1fr}.data.wide{grid-column:1/-1}.tax-table th{background:#ededff!important}.print{display:none}}
  </style></head><body><main class="page">${body}</main><button class="print" onclick="window.print()">Imprimir / salvar PDF</button></body></html>`;
}

function buildNifReport(data) {
  const secondTaxRow = data.taxCountry2 && data.taxNumber2 ? `<tr><td>${escapeReportHtml(data.taxCountry2)}</td><td>${escapeReportHtml(data.taxNumber2)}</td></tr>` : '';
  const birthData = data.personType === 'pf' ? `<div class="data"><small>Data de nascimento</small><strong>${escapeReportHtml(dateInPortuguese(data.birthDate))}</strong></div><div class="data"><small>País de nascimento</small><strong>${escapeReportHtml(data.birthCountry)}</strong></div>` : '';
  return reportShell('Declaração de Domicílio Fiscal - NIF', `
    ${reportHeader('Declaração cadastral')}
    <section class="title"><small>DOMICÍLIO FISCAL</small><h1>Declaração de Domicílio Fiscal - NIF</h1></section>
    <div class="data-grid"><div class="data wide"><small>${data.personType === 'pj' ? 'Razão social' : 'Nome completo'}</small><strong>${escapeReportHtml(data.name)}</strong></div><div class="data"><small>${data.personType === 'pj' ? 'CNPJ' : 'CPF'}</small><strong>${escapeReportHtml(data.document)}</strong></div>${birthData}<div class="data wide"><small>Endereço da sede/residência no Brasil</small><strong>${escapeReportHtml(data.address)}</strong></div></div>
    <div class="copy"><h2>Residência fiscal declarada</h2><p>DECLARO, para os devidos fins, que possuo domicílio fiscal nos países relacionados abaixo:</p></div>
    <table class="tax-table"><thead><tr><th>País / domicílio fiscal</th><th>NIF - Número de Identificação Fiscal</th></tr></thead><tbody><tr><td>${escapeReportHtml(data.taxCountry1)}</td><td>${escapeReportHtml(data.taxNumber1)}</td></tr>${secondTaxRow}</tbody></table>
    <div class="copy"><h2>Declarações</h2><p>Entendo que as informações fornecidas estão cobertas pelas disposições que regem o relacionamento do titular com o Banco do Brasil e que podem ser compartilhadas com autoridades fiscais, conforme a legislação e os acordos aplicáveis.</p><p>Certifico que sou o titular, ou estou autorizado a assinar em seu nome, e declaro que as informações prestadas são corretas e completas.</p><p>Comprometo-me a informar ao Banco do Brasil, no prazo de 30 dias, qualquer alteração que torne esta declaração incorreta ou incompleta, apresentando uma declaração atualizada.</p></div>
    <div class="data-grid"><div class="data"><small>Local</small><strong>${escapeReportHtml(data.place)}</strong></div><div class="data"><small>Data</small><strong>${escapeReportHtml(dateInPortuguese(data.date))}</strong></div></div>
    <div class="signature"><small>Assinatura</small><strong>${escapeReportHtml(data.signer)}</strong></div>
    ${standardReportFooter()}`);
}

function buildScrReport(data) {
  return reportShell('Autorização para Consulta ao SCR', `
    ${reportHeader('Autorização cadastral')}
    <section class="title"><small>SISTEMA DE INFORMAÇÕES DE CRÉDITO</small><h1>Autorização para Consulta ao SCR</h1></section>
    <div class="data-grid"><div class="data wide"><small>Nome do cliente / razão social</small><strong>${escapeReportHtml(data.name)}</strong></div><div class="data"><small>${data.personType === 'pj' ? 'CNPJ' : 'CPF'}</small><strong>${escapeReportHtml(data.document)}</strong></div><div class="data"><small>Local e data</small><strong>${escapeReportHtml(data.place)}, ${escapeReportHtml(dateInPortuguese(data.date))}</strong></div></div>
    <div class="copy"><p>Autorizo(amos) o Conglomerado Banco do Brasil S.A. a consultar os débitos e responsabilidades decorrentes de operações com características de crédito e as informações e registros de medidas judiciais que em meu(nosso) nome constem ou venham a constar do Sistema de Informações de Crédito (SCR), gerido pelo Banco Central do Brasil, ou dos sistemas que venham a complementá-lo ou substituí-lo.</p><h2>Estou(amos) ciente(s) de que:</h2><ol type="a"><li>o SCR provê informações ao Banco Central para monitoramento do crédito, fiscalização e intercâmbio de informações entre instituições financeiras;</li><li>posso(emos) acessar os dados registrados em meu(nosso) nome por meio do sistema Registrato do Banco Central;</li><li>pedidos de correção, exclusão ou manifestação de discordância devem ser dirigidos ao Banco do Brasil por requerimento escrito e fundamentado, quando o BB tiver sido responsável pelo envio;</li><li>a consulta de informações no SCR depende de prévia autorização;</li><li>o Conglomerado Banco do Brasil deve enviar ao SCR as informações das operações de crédito definidas pela regulamentação do Banco Central;</li><li>mais informações podem ser obtidas nas páginas do Banco Central e do Banco do Brasil.</li></ol></div>
    <div class="signature"><small>Assinatura do cliente ou representante autorizado</small><strong>${escapeReportHtml(data.name)}</strong></div>
    ${standardReportFooter()}`);
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function validateClientForm(prefix, data) {
  const form = byId(`${prefix}Form`);
  if (!form.checkValidity()) {
    form.reportValidity();
    setFormMessage(`${prefix}FormMessage`, 'Preencha todos os campos obrigatórios.', 'error');
    return false;
  }
  if (data.personType === 'pf' && !validCpf(data.document)) {
    setFormMessage(`${prefix}FormMessage`, 'Confira o CPF e os dígitos verificadores.', 'error');
    byId(`${prefix}Document`).focus();
    return false;
  }
  if (data.personType === 'pj' && (!formState[prefix] || formState[prefix].document !== cleanCnpj(data.document))) {
    setFormMessage(`${prefix}FormMessage`, 'Consulte o CNPJ antes de gerar o documento.', 'error');
    return false;
  }
  if (prefix === 'nif' && Boolean(data.taxCountry2) !== Boolean(data.taxNumber2)) {
    setFormMessage('nifFormMessage', 'Informe o outro país e o respectivo NIF, ou deixe os dois campos vazios.', 'error');
    return false;
  }
  setFormMessage(`${prefix}FormMessage`);
  return true;
}

function deliverHtmlReport(html, filename, popup) {
  if (popup) {
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  }
  const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
}

function handleReportSubmit(prefix, builder, filenamePrefix) {
  return async event => {
    event.preventDefault();
    const data = formValues(event.currentTarget);
    if (!validateClientForm(prefix, data)) return;
    const popup = window.open('', '_blank');
    await reportLogoReady;
    const documentNumber = prefix === 'nif' ? data.taxNumber1 : data.document;
    const safeDocument = data.personType === 'pj' ? cleanCnpj(documentNumber) : onlyDigits(documentNumber);
    const filename = `${filenamePrefix}_${safeDocument}.html`;
    deliverHtmlReport(builder(data), filename, popup);
    setFormMessage(`${prefix}FormMessage`, 'Documento gerado. A versão para impressão foi aberta e o HTML foi baixado.', 'success');
  };
}

['nif', 'scr'].forEach(prefix => {
  byId(`${prefix}PersonType`).addEventListener('change', () => syncPersonType(prefix));
  byId(`${prefix}Lookup`).addEventListener('click', () => lookupCompanyForForm(prefix));
  byId(`${prefix}Document`).addEventListener('input', event => {
    const isCompany = byId(`${prefix}PersonType`).value === 'pj';
    event.target.value = isCompany ? formatCnpj(event.target.value) : formatCpf(event.target.value);
    formState[prefix] = null;
    if (prefix === 'nif') byId('nifTaxNumber1').value = event.target.value;
    setFormMessage(`${prefix}LookupMessage`);
  });
  syncPersonType(prefix, false);
});

byId('nifName').addEventListener('input', event => {
  if (byId('nifPersonType').value === 'pf' && !byId('nifSigner').value) byId('nifSigner').value = event.target.value;
});

const today = new Date().toISOString().slice(0, 10);
byId('nifDate').value = today;
byId('scrDate').value = today;
byId('nifForm').addEventListener('submit', handleReportSubmit('nif', buildNifReport, 'Declaracao_Domicilio_Fiscal_NIF'));
byId('scrForm').addEventListener('submit', handleReportSubmit('scr', buildScrReport, 'Autorizacao_Consulta_SCR'));
