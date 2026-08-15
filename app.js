'use strict';

const state = {
  empresa: null,
  acesso: null,
  pessoas: [],
  garantias: [],
  agencia: {
    prefixo: '1031', nome: 'BONITO-MS', nomeCompleto: 'Agência 1031 - BONITO-MS', endereco: 'Rua Luiz da Costa Leite, 2279',
    bairro: 'Centro', municipio: 'Bonito', uf: 'MS', cep: '79.290-000', fonte: 'Planilha agencias.xlsx'
  }
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const form = $('#reportForm');
const cnpjInput = $('#cnpj');
const btnConsultar = $('#btnConsultar');
const companyMessage = $('#companyMessage');
const companyCard = $('#companyCard');
const peopleList = $('#peopleList');
const guaranteesList = $('#guaranteesList');
const automaticGuaranteesList = $('#automaticGuaranteesList');
const formMessage = $('#formMessage');
const btnGenerate = $('#btnGenerate');
const personMessage = $('#personMessage');
const loginMessage = $('#loginMessage');
const lowercaseNameWords = new Set(['da', 'do', 'das', 'dos', 'de', 'com']);
const sessionKey = 'centralFcoSessionV1';

function formatPersonName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR').split(' ').map(word => {
    if (lowercaseNameWords.has(word)) return word;
    return word.replace(/(^|[-'’])\p{L}/gu, match => match.toLocaleUpperCase('pt-BR'));
  }).join(' ');
}

function setAuthenticatedView(authenticated) {
  $('#loginScreen').hidden = authenticated;
  $$('.app-content').forEach(element => { element.hidden = !authenticated; });
}

function persistSession() {
  try {
    sessionStorage.setItem(sessionKey, JSON.stringify({ acesso: state.acesso, agencia: state.agencia }));
  } catch (_) {
    // O histórico do navegador ainda preserva a tela quando o armazenamento não está disponível.
  }
}

function restoreSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(sessionKey) || 'null');
    if (!saved?.acesso?.matricula || !saved?.acesso?.nome || !saved?.agencia?.prefixo) return;
    state.acesso = saved.acesso;
    state.agencia = saved.agencia;
    $('#sessionEmployee').textContent = `${state.acesso.matricula} · ${state.acesso.nome}`;
    renderAgency();
    setAuthenticatedView(true);
  } catch (_) {
    try { sessionStorage.removeItem(sessionKey); } catch (_) { /* armazenamento indisponível */ }
  }
}

function logoutApplication() {
  try { sessionStorage.removeItem(sessionKey); } catch (_) { /* armazenamento indisponível */ }
  state.acesso = null;
  $('#loginForm').reset();
  $('#sessionEmployee').textContent = 'Processamento local';
  clearMessage(loginMessage);
  setAuthenticatedView(false);
  window.scrollTo({ top: 0, behavior: 'instant' });
}

document.addEventListener('DOMContentLoaded', () => {
  $('#dataEmissao').value = new Date().toISOString().slice(0, 10);
  $$('.money-input').forEach(input => { input.value = formatMoneyInput(input.value); });
  renderPeople();
  renderGuarantees();
  syncConditionalFields();
  loadAgencies();
  restoreSession();
});

$('#loginForm').addEventListener('submit', enterApplication);
$('#btnLogout').addEventListener('click', logoutApplication);
$('#employeeRegistration').addEventListener('input', event => {
  event.target.value = event.target.value.toUpperCase().replace(/[^F0-9]/g, '').slice(0, 8);
  clearMessage(loginMessage);
});

cnpjInput.addEventListener('input', event => {
  event.target.value = formatCnpj(event.target.value);
  if (state.empresa && cleanDocument(event.target.value) !== state.empresa.cnpj) {
    state.empresa = null;
    companyCard.hidden = true;
  }
  clearMessage(companyMessage);
});
cnpjInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    consultCompany();
  }
});
btnConsultar.addEventListener('click', consultCompany);
$('#btnAddPerson').addEventListener('click', capturePerson);
$('#btnAddGuarantee').addEventListener('click', addGuarantee);
$('#tipoOperacao').addEventListener('change', syncConditionalFields);
$('#fcoMulher').addEventListener('change', syncTermRules);
$('#prazoTotal').addEventListener('input', () => validateTermInputs(true));
$('#carencia').addEventListener('input', () => validateTermInputs(true));
$('#loginAgency').addEventListener('change', event => consultAgency(event.target.value));
$$('.money-input:not([readonly])').forEach(input => input.addEventListener('input', event => {
  event.target.value = formatMoneyInput(event.target.value);
  calculateOwnResources();
}));
$('#personCpf').addEventListener('input', event => { event.target.value = formatCpf(event.target.value); clearMessage(personMessage); });
$('#personCep').addEventListener('input', event => { event.target.value = formatCep(event.target.value); clearMessage(personMessage); });
$('#giroAssociado').addEventListener('change', syncConditionalFields);
$('#situacaoFundos').addEventListener('change', syncConditionalFields);
form.addEventListener('submit', generateReports);

peopleList.addEventListener('click', event => {
  const button = event.target.closest('[data-action="remove-person"]');
  if (!button) return;
  removeEntry(state.pessoas, button.closest('[data-id]').dataset.id, renderPeople);
});

guaranteesList.addEventListener('input', event => {
  if (event.target.dataset.field === 'cpf') event.target.value = formatCpf(event.target.value);
  if (event.target.dataset.field === 'cnpj') event.target.value = formatCnpj(event.target.value);
  updateRepeatedState(event, state.garantias);
});
guaranteesList.addEventListener('change', event => {
  updateRepeatedState(event, state.garantias);
  if (['categoria', 'pessoaTipo', 'bemTipo'].includes(event.target.dataset.field)) renderGuarantees();
});
guaranteesList.addEventListener('click', event => {
  const button = event.target.closest('[data-action="remove-guarantee"]');
  if (!button) return;
  removeEntry(state.garantias, button.closest('[data-id]').dataset.id, renderGuarantees);
});

function id() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cleanDocument(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14);
}

function formatCnpj(value) {
  const raw = cleanDocument(value);
  if (!raw) return '';
  let result = raw.slice(0, 2);
  if (raw.length > 2) result += `.${raw.slice(2, 5)}`;
  if (raw.length > 5) result += `.${raw.slice(5, 8)}`;
  if (raw.length > 8) result += `/${raw.slice(8, 12)}`;
  if (raw.length > 12) result += `-${raw.slice(12, 14)}`;
  return result;
}

function formatCpf(value) {
  const raw = String(value || '').replace(/\D/g, '').slice(0, 11);
  return raw
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

function formatMoneyInput(value) {
  const digits = String(value || '').replace(/\D/g, '');
  const amount = Number(digits || '0') / 100;
  return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function moneyValue(value) {
  const normalized = String(value || '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoneyValue(value) {
  return Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function validateCnpj(value) {
  const raw = cleanDocument(value);
  if (!/^[A-Z0-9]{12}\d{2}$/.test(raw) || /^(\d)\1{13}$/.test(raw)) return false;
  const charValue = character => character.charCodeAt(0) - 48;
  const digit = (base, weights) => {
    const sum = [...base].reduce((total, character, index) => total + charValue(character) * weights[index], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  const base = raw.slice(0, 12);
  const first = digit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = digit(base + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return raw.slice(12) === `${first}${second}`;
}

async function enterApplication(event) {
  event.preventDefault();
  clearMessage(loginMessage);
  const matricula = $('#employeeRegistration').value.trim().toUpperCase();
  const nome = formatPersonName($('#employeeName').value);
  const prefixo = $('#loginAgency').value;
  if (!prefixo) return showMessage(loginMessage, 'Selecione uma agência.', 'error');
  if (!/^F\d{7}$/.test(matricula)) return showMessage(loginMessage, 'Informe a matrícula no formato F seguido de sete números.', 'error');
  if (nome.length < 3) return showMessage(loginMessage, 'Informe o nome do funcionário.', 'error');

  setButtonLoading($('#btnLogin'), true, 'Consultando agência...');
  await consultAgency(prefixo);
  setButtonLoading($('#btnLogin'), false, 'Acessar Central FCO');
  if (!state.agencia?.endereco) {
    showMessage(loginMessage, 'Não foi possível completar o endereço da agência. Tente novamente.', 'error');
    return;
  }
  state.acesso = { matricula, nome };
  $('#sessionEmployee').textContent = `${matricula} · ${nome}`;
  persistSession();
  setAuthenticatedView(true);
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function calculateOwnResources() {
  const budget = moneyValue($('#valorOrcamento').value);
  const financedBase = moneyValue($('#valorFinanciado').value);
  const associatedWorkingCapital = $('#giroAssociado').checked ? moneyValue($('#valorGiro').value) : 0;
  const totalFinanced = financedBase + associatedWorkingCapital;
  $('#recursosProprios').value = formatMoneyValue(Math.max(0, budget - totalFinanced));
  $('#totalFinanciadoHint').textContent = `Total financiado: R$ ${formatMoneyValue(totalFinanced)}.`;
}

async function consultCompany() {
  const cnpj = cleanDocument(cnpjInput.value);
  clearMessage(companyMessage);
  companyCard.hidden = true;
  state.empresa = null;

  if (!validateCnpj(cnpj)) {
    showMessage(companyMessage, 'Confira o CNPJ e os dígitos verificadores.', 'error');
    return;
  }

  setButtonLoading(btnConsultar, true, 'Consultando...');
  try {
    const data = await window.CnpjApi.request(cnpj);

    const typeStreet = data.descricao_tipo_de_logradouro || data.descricao_tipo_logradouro || '';
    const street = [typeStreet, data.logradouro].filter(Boolean).join(' ').trim();
    state.empresa = {
      cnpj,
      cnpjFormatado: formatCnpj(cnpj),
      razaoSocial: data.razao_social || data.nome || '',
      nomeFantasia: data.nome_fantasia || data.fantasia || '',
      naturezaJuridica: data.descricao_natureza_juridica || data.natureza_juridica || '',
      tipoEstabelecimento: data.descricao_identificador_matriz_filial || data.tipo || '',
      porte: data.porte || data.descricao_porte || '',
      situacao: data.descricao_situacao_cadastral || data.situacao || data.situacao_cadastral || '',
      endereco: {
        logradouro: street,
        numero: data.numero || 'S/N',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        cep: formatCep(data.cep),
        municipio: data.municipio || '',
        uf: data.uf || ''
      }
    };
    state.empresa.enderecoCompleto = joinAddress(state.empresa.endereco);
    renderCompany();
    if (!$('#localEmpreendimento').value) $('#localEmpreendimento').value = state.empresa.enderecoCompleto;
    showMessage(companyMessage, 'Dados cadastrais carregados. Confira o resumo antes de continuar.', 'success');
  } catch (error) {
    showMessage(companyMessage, error.message || 'Não foi possível consultar o CNPJ.', 'error');
  } finally {
    setButtonLoading(btnConsultar, false, 'Consultar CNPJ');
  }
}

function formatCep(value) {
  const raw = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (raw.length <= 2) return raw;
  if (raw.length <= 5) return `${raw.slice(0, 2)}.${raw.slice(2)}`;
  return `${raw.slice(0, 2)}.${raw.slice(2, 5)}-${raw.slice(5)}`;
}

function joinAddress(address) {
  const first = [address.logradouro, address.numero].filter(Boolean).join(', ');
  const second = [address.complemento, address.bairro].filter(Boolean).join(' - ');
  const city = [address.municipio, address.uf].filter(Boolean).join('-');
  return [first, second, city, address.cep && `CEP ${address.cep}`].filter(Boolean).join(', ');
}

function renderCompany() {
  const company = state.empresa;
  $('#companyName').textContent = company.razaoSocial || 'Não informado';
  $('#companyCnpj').textContent = company.cnpjFormatado;
  $('#companyTradeName').textContent = company.nomeFantasia || 'Não informado';
  $('#companyLegalType').textContent = company.naturezaJuridica || 'Não informado';
  $('#companyBranchType').textContent = company.tipoEstabelecimento || 'Não informado';
  $('#companyAddress').textContent = company.enderecoCompleto || 'Não informado';
  $('#companyStatus').textContent = company.situacao || 'Consultado';
  companyCard.hidden = false;
}

async function loadAgencies() {
  const select = $('#loginAgency');
  try {
    const agencies = window.FCO_AGENCIES || [];
    if (!Array.isArray(agencies) || !agencies.length) throw new Error('Lista indisponível.');
    select.innerHTML = agencies.map(agency => `
      <option value="${escapeHtml(agency.prefixo)}"${agency.prefixo === state.agencia.prefixo ? ' selected' : ''}>${escapeHtml(agency.prefixo)} - ${escapeHtml(agency.nome)}</option>
    `).join('');
    $('#agencyLookupStatus').textContent = 'Prefixos e endereços carregados da planilha local.';
  } catch (error) {
    select.innerHTML = '<option value="1031" selected>1031 - BONITO-MS</option>';
    renderAgency();
    $('#agencyLookupStatus').textContent = 'A lista completa não pôde ser carregada; Bonito permanece selecionada.';
  }
}

async function consultAgency(prefix) {
  if (!prefix) return;
  const status = $('#agencyLookupStatus');
  status.textContent = 'Carregando o endereço da planilha local...';
  try {
    const agency = (window.FCO_AGENCIES || []).find(item => item.prefixo === prefix);
    if (!agency) throw new Error('Endereço não localizado.');
    state.agencia = agency;
    status.textContent = 'Endereço carregado da planilha agencias.xlsx.';
  } catch (error) {
    const option = $('#loginAgency').selectedOptions[0];
    state.agencia = { prefixo: prefix, nome: option?.textContent?.replace(/^\d+\s*-\s*/, '') || '', nomeCompleto: '', endereco: '', bairro: '', municipio: '', uf: 'MS', cep: '', fonte: 'Endereço pendente' };
    status.textContent = 'A agência não foi encontrada na planilha local.';
  }
  renderAgency();
}

function renderAgency() {
  const agency = state.agencia;
  const displayName = agency.nomeCompleto || `Agência ${agency.prefixo} - ${agency.nome || ''}`.trim();
  const address = [agency.endereco, agency.bairro, [agency.municipio, agency.uf].filter(Boolean).join('-'), agency.cep && `CEP ${agency.cep}`].filter(Boolean).join(' · ');
  $('#agencyIcon').textContent = agency.prefixo;
  $('#agencyName').textContent = displayName;
  $('#agencyAddress').textContent = address || 'Endereço não localizado';
  $('#agencySource').textContent = agency.fonte || 'Planilha agencias.xlsx';
  $('#heroAgency').textContent = `${displayName.replace(/^Agência\s*/i, 'AGÊNCIA ')}`;
  $('#footerAgency').textContent = `Central FCO Web · Agência ${agency.prefixo}`;
  if ($('#localEmissao') && agency.municipio && agency.uf) $('#localEmissao').value = `${agency.municipio}-${agency.uf}`;
}

function capturePerson() {
  clearMessage(personMessage);
  const person = {
    id: id(), nome: formatPersonName($('#personName').value), cpf: $('#personCpf').value.trim(),
    nacionalidade: $('#personNationality').value.trim(), estadoCivil: $('#personCivilStatus').value,
    logradouro: $('#personStreet').value.trim(), numero: $('#personNumber').value.trim(),
    complemento: $('#personComplement').value.trim(), bairro: $('#personDistrict').value.trim(),
    municipio: $('#personCity').value.trim(), uf: $('#personState').value.trim().toUpperCase(),
    cep: formatCep($('#personCep').value), dirigente: $('#personDirector').checked,
    representanteLegal: $('#personRepresentative').checked,
  };
  if (!person.nome || !person.cpf) return showMessage(personMessage, 'Informe nome e CPF.', 'error');
  if (!person.dirigente && !person.representanteLegal) return showMessage(personMessage, 'Marque Dirigente ou Representante legal.', 'error');
  if (state.pessoas.some(saved => saved.cpf.replace(/\D/g, '') === person.cpf.replace(/\D/g, ''))) {
    return showMessage(personMessage, 'Este CPF já foi adicionado.', 'error');
  }
  state.pessoas.push(person);
  renderPeople();
  clearPersonEntry();
  showMessage(personMessage, 'Pessoa adicionada à proposta.', 'success');
}

function clearPersonEntry() {
  ['personName', 'personCpf', 'personCivilStatus', 'personStreet', 'personNumber', 'personComplement', 'personDistrict', 'personCity', 'personState', 'personCep']
    .forEach(identifier => { $(`#${identifier}`).value = ''; });
  $('#personNationality').value = 'Brasileira';
  $('#personDirector').checked = false;
  $('#personRepresentative').checked = false;
  $('#personName').focus();
}

function renderPeople() {
  peopleList.innerHTML = '';
  if (!state.pessoas.length) {
    renderEmpty(peopleList, 'Nenhuma pessoa adicionada.');
    renderAutomaticGuarantees();
    return;
  }
  state.pessoas.forEach((person, index) => {
    const card = document.createElement('article');
    card.className = 'repeat-card';
    card.dataset.id = person.id;
    card.innerHTML = `
      <div class="person-head">
        <span class="person-head__number">${String(index + 1).padStart(2, '0')}</span>
        <h3>${escapeHtml(person.nome)}</h3>
        <button class="icon-button" data-action="remove-person" type="button" aria-label="Remover pessoa">×</button>
      </div>
      <div class="person-summary">
        <span><strong>CPF</strong>${escapeHtml(person.cpf)}</span>
        <span><strong>Papéis</strong>${[person.dirigente && 'Dirigente', person.representanteLegal && 'Representante legal'].filter(Boolean).join(' · ')}</span>
        <span><strong>Dados pessoais</strong>${escapeHtml([person.nacionalidade, person.estadoCivil].filter(Boolean).join(' · ') || 'Não informado')}</span>
        <span class="person-summary__wide"><strong>Endereço</strong>${escapeHtml(joinAddress({logradouro:person.logradouro,numero:person.numero,complemento:person.complemento,bairro:person.bairro,municipio:person.municipio,uf:person.uf,cep:person.cep}) || 'Não informado')}</span>
      </div>`;
    peopleList.append(card);
  });
  renderAutomaticGuarantees();
}

function renderAutomaticGuarantees() {
  const directors = state.pessoas.filter(person => person.dirigente);
  if (!directors.length) {
    automaticGuaranteesList.innerHTML = '<span class="automatic-guarantees__empty">Nenhum dirigente marcado.</span>';
    return;
  }
  automaticGuaranteesList.innerHTML = directors.map(person => `
    <span class="automatic-guarantee"><strong>${escapeHtml(person.nome || 'Dirigente sem nome')}</strong><small>${escapeHtml(person.cpf || 'CPF pendente')}</small></span>
  `).join('');
}

function addGuarantee() {
  state.garantias.push({
    id: id(), categoria: 'real', pessoaTipo: 'pf', nome: '', cpf: '', razaoSocial: '', cnpj: '',
    bemTipo: 'bem_financiado', descricao: '', percentualVinculo: ''
  });
  renderGuarantees();
}

function renderGuarantees() {
  guaranteesList.innerHTML = '';
  if (!state.garantias.length) return renderEmpty(guaranteesList, 'Nenhuma garantia adicional cadastrada.');
  state.garantias.forEach((guarantee, index) => {
    const card = document.createElement('article');
    card.className = 'repeat-card';
    card.dataset.id = guarantee.id;
    const personal = guarantee.categoria === 'pessoal';
    const individual = guarantee.pessoaTipo === 'pf';
    card.innerHTML = `
      <div class="guarantee-head">
        <span class="guarantee-head__number">${String(index + 1).padStart(2, '0')}</span>
        <h3>Garantia adicional ${personal ? 'pessoal' : 'real'}</h3>
        <button class="icon-button" data-action="remove-guarantee" type="button" aria-label="Remover garantia">×</button>
      </div>
      <div class="guarantee-grid">
        ${selectField('Categoria', 'categoria', guarantee.categoria, [['pessoal', 'Pessoal'], ['real', 'Real']])}
        ${personal ? `
          ${selectField('Tipo de garantidor', 'pessoaTipo', guarantee.pessoaTipo, [['pf', 'Pessoa física'], ['pj', 'Pessoa jurídica']])}
          ${individual ? field('Nome', 'nome', guarantee.nome, 'text') + field('CPF', 'cpf', guarantee.cpf, 'text') : field('Razão social', 'razaoSocial', guarantee.razaoSocial, 'text') + field('CNPJ', 'cnpj', guarantee.cnpj, 'text')}
        ` : `
          ${selectField('Tipo de bem', 'bemTipo', guarantee.bemTipo, [
            ['bem_financiado', 'Bem financiado'], ['imovel', 'Imóvel'], ['veiculo', 'Veículo'],
            ['maquinas_equipamentos', 'Máquinas e equipamentos'], ['recebiveis', 'Recebíveis']
          ])}
          ${field(guarantee.bemTipo === 'bem_financiado' ? 'Item financiado' : 'Descrição/origem', 'descricao', guarantee.descricao, 'text', 'field--span-2')}
          ${field('Percentual de vínculo', 'percentualVinculo', guarantee.percentualVinculo, 'number')}
        `}
      </div>`;
    guaranteesList.append(card);
  });
}

function field(label, name, value, type = 'text', extraClass = '') {
  const numeric = type === 'number' ? ' min="0" max="100" step="0.01"' : '';
  return `<div class="field ${extraClass}"><label>${label}</label><input data-field="${name}" type="${type}" value="${escapeHtml(value)}"${numeric}></div>`;
}

function selectField(label, name, value, options) {
  const normalized = options.map(option => Array.isArray(option) ? option : [option, option]);
  return `<div class="field"><label>${label}</label><select data-field="${name}">${normalized.map(([optionValue, text]) => `<option value="${escapeHtml(optionValue)}"${String(value) === String(optionValue) ? ' selected' : ''}>${escapeHtml(text || 'Selecione')}</option>`).join('')}</select></div>`;
}

function checkField(label, name, checked) {
  return `<label class="check"><input data-field="${name}" type="checkbox"${checked ? ' checked' : ''}><span>${label}</span></label>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]);
}

function updateRepeatedState(event, collection) {
  const fieldName = event.target.dataset.field;
  const card = event.target.closest('[data-id]');
  if (!fieldName || !card) return;
  const entry = collection.find(item => item.id === card.dataset.id);
  if (!entry) return;
  entry[fieldName] = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
}

function removeEntry(collection, entryId, render) {
  const index = collection.findIndex(entry => entry.id === entryId);
  if (index >= 0) collection.splice(index, 1);
  render();
}

function renderEmpty(container, text) {
  container.innerHTML = `<div class="empty-state">${text}</div>`;
}

function getTermRule(type, fcoMulher) {
  if (type === 'giro_dissociado') {
    return fcoMulher
      ? { maxTotal: 48, maxGrace: 6, maxRepayment: null, label: 'Capital de Giro · FCO Mulher' }
      : { maxTotal: 24, maxGrace: 3, maxRepayment: null, label: 'Capital de Giro' };
  }
  return fcoMulher
    ? { maxTotal: 168, maxGrace: 48, maxRepayment: 120, label: 'Investimento · FCO Mulher' }
    : { maxTotal: 144, maxGrace: 24, maxRepayment: 120, label: 'Investimento' };
}

function termRuleErrors(operation) {
  const rule = getTermRule(operation.tipo, operation.fcoMulher);
  const total = Number(operation.prazoTotalMeses || 0);
  const grace = Number(operation.carenciaMeses || 0);
  const errors = [];
  if (grace < 3 || grace % 3 !== 0) errors.push('A carência deve ser um múltiplo de 3, começando em 3 meses.');
  if (grace > rule.maxGrace) errors.push(`A carência máxima para ${rule.label} é de ${rule.maxGrace} meses.`);
  if (total > rule.maxTotal) errors.push(`O prazo total máximo para ${rule.label} é de ${rule.maxTotal} meses.`);
  if (total > 0 && total <= grace) errors.push('O prazo total deve ser maior que a carência.');
  if (rule.maxRepayment !== null && total > grace && total - grace > rule.maxRepayment) {
    errors.push(`A amortização não pode superar ${rule.maxRepayment} meses; prazo total menos carência deve ser de até ${rule.maxRepayment}.`);
  }
  return errors;
}

function validateTermInputs(showState = false) {
  const type = $('#tipoOperacao').value;
  const fcoMulher = $('#fcoMulher').checked;
  const total = numberValue($('#prazoTotal').value);
  const grace = numberValue($('#carencia').value);
  const rule = getTermRule(type, fcoMulher);
  const operation = { tipo: type, fcoMulher, prazoTotalMeses: total, carenciaMeses: grace };
  const errors = total > 0 || grace > 0 ? termRuleErrors(operation) : [];
  const panel = $('#termRulePanel');
  $('#prazoTotal').max = String(rule.maxTotal);
  $('#carencia').max = String(rule.maxGrace);
  $('#carencia').min = '3';
  $('#carencia').step = '3';
  $('#prazoTotal').setCustomValidity(errors.join(' '));
  $('#carencia').setCustomValidity(errors.join(' '));
  const repaymentText = rule.maxRepayment === null ? '' : ` e amortização de até ${rule.maxRepayment} meses`;
  if (showState && errors.length) {
    panel.textContent = errors.join(' ');
    panel.className = 'term-rule-panel field--span-4 is-error';
  } else if (showState && total > 0 && grace > 0) {
    panel.innerHTML = `<strong>Configuração válida.</strong> ${grace} meses de carência + ${total - grace} meses de pagamento = ${total} meses no total.`;
    panel.className = 'term-rule-panel field--span-4 is-valid';
  } else {
    panel.innerHTML = `<strong>${rule.label}:</strong> prazo total até ${rule.maxTotal} meses, carência até ${rule.maxGrace} meses${repaymentText}. Carência sempre em múltiplos de 3.`;
    panel.className = 'term-rule-panel field--span-4';
  }
  return errors;
}

function syncTermRules() {
  validateTermInputs(Boolean($('#prazoTotal').value || $('#carencia').value));
}

function syncConditionalFields() {
  const isInvestment = $('#tipoOperacao').value === 'investimento';
  $('#linhaCreditoField').hidden = !isInvestment;
  $('#investmentModalityGroup').hidden = !isInvestment;
  $('#giroPurposeGroup').hidden = isInvestment;
  $('#linhaCredito').required = isInvestment;
  if (!isInvestment) {
    $('#linhaCredito').value = '';
    $$('[name="modalidades"]').forEach(input => { input.checked = false; });
  }
  $('#valorGiroField').hidden = !$('#giroAssociado').checked;
  calculateOwnResources();
  $('#fundsGroup').hidden = $('#situacaoFundos').value !== 'beneficiaria';
  syncTermRules();
}

function collectStaticData() {
  const data = new FormData(form);
  const valorOrcamento = moneyValue(data.get('valorOrcamento'));
  const valorFinanciadoBase = moneyValue(data.get('valorFinanciado'));
  const giroAssociado = data.get('giroAssociado') === 'on';
  const valorGiroAssociado = giroAssociado ? moneyValue(data.get('valorGiro')) : 0;
  const valorFinanciado = valorFinanciadoBase + valorGiroAssociado;
  return {
    empresa: state.empresa,
    agencia: state.agencia,
    acesso: state.acesso,
    operacao: {
      tipo: data.get('tipoOperacao'), linhaCredito: data.get('tipoOperacao') === 'giro_dissociado' ? 'Capital de Giro Dissociado' : data.get('linhaCredito'), propostaCop: data.get('propostaCop'),
      finalidade: data.get('finalidade'), modalidades: data.getAll('modalidades'), finalidadesGiro: data.getAll('finalidadesGiro'), fcoMulher: data.get('fcoMulher') === 'on',
      descricao: data.get('descricaoFinalidade'), localEmpreendimento: data.get('localEmpreendimento'),
      valorOrcamento, valorFinanciadoBase, valorFinanciado,
      recursosProprios: Math.max(0, valorOrcamento - valorFinanciado), prazoTotalMeses: numberValue(data.get('prazoTotal')),
      carenciaMeses: numberValue(data.get('carencia')), giroAssociado,
      valorGiroAssociado, agenciaDebito: data.get('agenciaDebito'), contaDebito: data.get('contaDebito'),
      outrasInformacoes: data.get('outrasInformacoes'), itens: [],
      garantias: state.garantias.map(({ id: _, ...guarantee }) => ({
        ...guarantee,
        nome: formatPersonName(guarantee.nome),
        percentualVinculo: numberValue(guarantee.percentualVinculo)
      }))
    },
    pessoas: state.pessoas.map(({ id: _, ...person }) => person),
    declaracoes: { situacaoFundos: data.get('situacaoFundos'), fundos: data.getAll('fundos') },
    emissao: { local: data.get('localEmissao'), data: data.get('dataEmissao') }
  };
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function validatePayload(payload) {
  const errors = [];
  if (!payload.acesso?.matricula || !payload.acesso?.nome) errors.push('Identificação do funcionário ausente. Entre novamente.');
  if (!payload.empresa) errors.push('Consulte um CNPJ válido antes de gerar.');
  if (payload.operacao.tipo === 'investimento' && !payload.operacao.linhaCredito) errors.push('Selecione a linha de crédito.');
  if (!payload.operacao.finalidade.trim()) errors.push('Informe a finalidade da operação.');
  if (!payload.operacao.descricao.trim()) errors.push('Descreva o empreendimento.');
  if (payload.operacao.valorOrcamento <= 0) errors.push('Informe o valor do orçamento.');
  if (payload.operacao.valorFinanciado <= 0) errors.push('Informe o valor a financiar.');
  if (payload.operacao.giroAssociado && payload.operacao.valorGiroAssociado <= 0) errors.push('Informe o valor do giro associado.');
  if (payload.operacao.valorFinanciado > payload.operacao.valorOrcamento) errors.push('O valor a financiar não pode superar o valor do orçamento.');
  if (payload.operacao.prazoTotalMeses <= 0) errors.push('Informe o prazo total.');
  errors.push(...termRuleErrors(payload.operacao));
  if (!payload.operacao.agenciaDebito.trim()) errors.push('Informe a agência para débito.');
  if (!payload.operacao.contaDebito.trim()) errors.push('Informe a conta para débito.');
  if (!payload.agencia?.prefixo || !payload.agencia?.endereco) errors.push('Selecione uma agência responsável com endereço consultado.');
  if (!payload.pessoas.some(person => person.dirigente)) errors.push('Adicione ao menos um dirigente.');
  if (!payload.pessoas.some(person => person.representanteLegal)) errors.push('Adicione ao menos um representante legal.');
  payload.pessoas.forEach((person, index) => {
    if (!person.nome.trim() || !person.cpf.trim()) errors.push(`Complete nome e CPF da pessoa ${index + 1}.`);
  });
  payload.operacao.garantias.forEach((guarantee, index) => {
    if (guarantee.categoria === 'pessoal') {
      const missing = guarantee.pessoaTipo === 'pf' ? !guarantee.nome.trim() || !guarantee.cpf.trim() : !guarantee.razaoSocial.trim() || !guarantee.cnpj.trim();
      if (missing) errors.push(`Complete a garantia pessoal ${index + 1}.`);
    } else if (!guarantee.descricao.trim() || guarantee.percentualVinculo <= 0 || guarantee.percentualVinculo > 100) {
      errors.push(`Complete a descrição e o percentual da garantia real ${index + 1}.`);
    }
  });
  if (payload.declaracoes.situacaoFundos === 'beneficiaria' && !payload.declaracoes.fundos.length) errors.push('Selecione ao menos um fundo beneficiário.');
  return [...new Set(errors)];
}

async function generateReports(event) {
  event.preventDefault();
  clearMessage(formMessage);
  const payload = collectStaticData();
  const errors = validatePayload(payload);
  if (errors.length) {
    showMessage(formMessage, errors.join(' '), 'error');
    formMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const preview = window.open('', '_blank');
  if (preview) preview.document.write('<!doctype html><title>Gerando dossiê...</title><p style="font:16px Calibri,Arial;padding:30px">Gerando documentos...</p>');
  setButtonLoading(btnGenerate, true, 'Gerando documentos...');
  try {
    const dossier = await window.FCOReports.renderDossier(payload);
    if (preview) {
      preview.document.open();
      preview.document.write(dossier);
      preview.document.close();
    }
    const blob = new Blob([dossier], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    const safeName = (state.empresa.razaoSocial || 'empresa').replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');
    link.href = URL.createObjectURL(blob);
    link.download = `Relatorios_FCO_${safeName}_${state.empresa.cnpj}.html`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1500);
    showMessage(formMessage, preview ? 'Relatórios gerados. A versão para impressão foi aberta e uma cópia HTML foi baixada.' : 'Relatórios gerados e baixados em HTML. Autorize pop-ups para abrir a versão de impressão.', 'success');
  } catch (error) {
    if (preview) preview.close();
    showMessage(formMessage, error.message || 'Falha ao gerar os relatórios.', 'error');
  } finally {
    setButtonLoading(btnGenerate, false, 'Gerar Relatórios');
  }
}

function setButtonLoading(button, loading, label) {
  button.disabled = loading;
  button.innerHTML = loading ? `<span class="spinner" aria-hidden="true"></span>${label}` : label;
}

function showMessage(element, text, type) {
  element.textContent = text;
  element.className = `${element === formMessage ? 'form-message' : 'inline-message'} is-${type}`;
}

function clearMessage(element) {
  element.textContent = '';
  element.className = element === formMessage ? 'form-message' : 'inline-message';
}
