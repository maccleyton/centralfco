'use strict';

const state = {
  empresa: null,
  acesso: null,
  pessoas: [],
  garantias: [],
  agencia: {
    prefixo: '1031', nome: 'BONITO-MS', nomeCompleto: 'Agência 1031 - BONITO-MS', endereco: 'Rua Luiz da Costa Leite, 2279',
    bairro: 'Centro', municipio: 'Bonito', uf: 'MS', cep: '79.290-000', fonte: 'Base JavaScript versionada'
  }
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const form = $('#reportForm');
const cnpjInput = $('#cnpj');
const btnConsultar = $('#btnConsultar');
const companyMessage = $('#companyMessage');
const companyCard = $('#companyCard');
const manualCompanyPrompt = $('#manualCompanyPrompt');
const manualCompanyForm = $('#manualCompanyForm');
const peopleList = $('#peopleList');
const guaranteesList = $('#guaranteesList');
const automaticGuaranteesList = $('#automaticGuaranteesList');
const formMessage = $('#formMessage');
const btnGenerate = $('#btnGenerate');
const personMessage = $('#personMessage');
const guaranteeMessage = $('#guaranteeMessage');
const loginMessage = $('#loginMessage');
const lowercaseNameWords = new Set(['da', 'do', 'das', 'dos', 'de', 'com']);
const sessionKey = 'centralFcoSessionV1';

function formatPersonName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR').split(' ').map(word => {
    if (lowercaseNameWords.has(word)) return word;
    return word.replace(/(^|[-'’])\p{L}/gu, match => match.toLocaleUpperCase('pt-BR'));
  }).join(' ');
}

function hasFullName(value) {
  return formatPersonName(value).split(/\s+/).filter(part => /\p{L}/u.test(part)).length >= 2;
}

function formatBankReference(value, baseDigits = 7) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, baseDigits + 1);
  return digits.length < 2 ? digits : `${digits.slice(0, -1)}-${digits.slice(-1)}`;
}

function validBankReference(value, exactBaseDigits = null) {
  const pattern = exactBaseDigits === null ? /^\d{1,7}-\d$/ : new RegExp(`^\\d{${exactBaseDigits}}-\\d$`);
  return pattern.test(String(value || '').trim());
}

function showCentralView(view = 'hub') {
  const authenticated = Boolean(state.acesso);
  const hub = $('#hubScreen');
  const proposal = $('#inicio');
  const headerHubButton = $('#btnHeaderHub');
  const sessionMeta = $('.topbar__meta');
  const logoutButton = $('#btnLogout');
  if (hub) hub.hidden = !authenticated || view !== 'hub';
  if (proposal) proposal.hidden = !authenticated || view !== 'proposal';
  if (headerHubButton) headerHubButton.hidden = !authenticated || view === 'hub';
  if (sessionMeta) sessionMeta.hidden = !authenticated || view !== 'hub';
  if (logoutButton) logoutButton.hidden = !authenticated || view !== 'hub';
  if (authenticated) window.scrollTo({ top: 0, behavior: 'instant' });
}

function setAuthenticatedView(authenticated) {
  $('#loginScreen').hidden = authenticated;
  const topbar = $('.topbar.app-content');
  const footer = $('.footer.app-content');
  if (topbar) topbar.hidden = !authenticated;
  if (footer) footer.hidden = !authenticated;
  if (authenticated) showCentralView('hub');
  else {
    if ($('#hubScreen')) $('#hubScreen').hidden = true;
    if ($('#inicio')) $('#inicio').hidden = true;
  }
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
  syncSpouseFields();
  syncGuaranteeEntry();
  syncConditionalFields();
  loadAgencies();
  restoreSession();
  const currentCompany = window.CentralData?.getCurrent();
  if (currentCompany && !cnpjInput.value) cnpjInput.value = formatCnpj(currentCompany.cnpj);
});

$('#loginForm').addEventListener('submit', enterApplication);
$('#btnLogout').addEventListener('click', logoutApplication);
$('#btnOpenProposal').addEventListener('click', () => showCentralView('proposal'));
$('#btnHeaderHub').addEventListener('click', () => showCentralView('hub'));
$('#btnHubHome').addEventListener('click', event => {
  event.preventDefault();
  showCentralView('hub');
});
$('#employeeRegistration').addEventListener('input', event => {
  event.target.value = event.target.value.toUpperCase().replace(/[^F0-9]/g, '').slice(0, 8);
  clearMessage(loginMessage);
});
$('#employeeName').addEventListener('input', () => clearMessage(loginMessage));

cnpjInput.addEventListener('input', event => {
  event.target.value = formatCnpj(event.target.value);
  if (state.empresa && cleanDocument(event.target.value) !== state.empresa.cnpj) {
    state.empresa = null;
    companyCard.hidden = true;
  }
  clearMessage(companyMessage);
  resetManualCompanyFlow();
});
cnpjInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    consultCompany();
  }
});
btnConsultar.addEventListener('click', consultCompany);
$('#btnManualCompanyYes').addEventListener('click', () => {
  manualCompanyPrompt.hidden = true;
  manualCompanyForm.hidden = false;
  $('#manualCompanyName').focus();
});
$('#btnManualCompanyNo').addEventListener('click', resetManualCompanyFlow);
$('#btnCancelManualCompany').addEventListener('click', resetManualCompanyFlow);
$('#btnSaveManualCompany').addEventListener('click', saveManualCompany);
$('#manualCompanyLegalType').addEventListener('change', event => {
  const isOther = event.target.value === 'Outro';
  $('#manualCompanyOtherTypeField').hidden = !isOther;
  $('#manualCompanyOtherType').value = isOther ? $('#manualCompanyOtherType').value : '';
  if (isOther) $('#manualCompanyOtherType').focus();
});
$('#btnAddPerson').addEventListener('click', capturePerson);
$('#btnAddGuarantee').addEventListener('click', captureGuarantee);
$('#personHasSpouse').addEventListener('change', syncSpouseFields);
$('#guaranteeCategory').addEventListener('change', syncGuaranteeEntry);
$('#guaranteePersonType').addEventListener('change', syncGuaranteeEntry);
$('#guaranteeAssetType').addEventListener('change', syncGuaranteeEntry);
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
$('#spouseCpf').addEventListener('input', event => { event.target.value = formatCpf(event.target.value); clearMessage(personMessage); });
$('#personCep').addEventListener('input', event => { event.target.value = formatCep(event.target.value); clearMessage(personMessage); });
Object.entries({ agenciaDebito: 4, contaDebito: 7 }).forEach(([identifier, baseDigits]) => $(`#${identifier}`).addEventListener('input', event => {
  event.target.value = formatBankReference(event.target.value, baseDigits);
  clearMessage(formMessage);
}));
$('#guaranteeCpf').addEventListener('input', event => { event.target.value = formatCpf(event.target.value); clearMessage(guaranteeMessage); });
$('#guaranteeCnpj').addEventListener('input', event => { event.target.value = formatCnpj(event.target.value); clearMessage(guaranteeMessage); });
$('#giroAssociado').addEventListener('change', syncConditionalFields);
$('#situacaoFundos').addEventListener('change', syncConditionalFields);
form.addEventListener('submit', generateReports);

peopleList.addEventListener('click', event => {
  const button = event.target.closest('[data-action="remove-person"]');
  if (!button) return;
  removeEntry(state.pessoas, button.closest('[data-id]').dataset.id, renderPeople);
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

function validateCpf(value) {
  const cpf = String(value || '').replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = length => {
    const sum = cpf.slice(0, length).split('').reduce((total, number, index) => total + Number(number) * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
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

function normalizedPersonalDocument(value, type) {
  return type === 'cpf' ? String(value || '').replace(/\D/g, '') : cleanDocument(value);
}

function guaranteeDocument(guarantee) {
  if (guarantee.categoria !== 'pessoal') return null;
  const type = guarantee.pessoaTipo === 'pj' ? 'cnpj' : 'cpf';
  return { type, value: normalizedPersonalDocument(guarantee[type], type) };
}

function personalDocumentDuplicate(value, type, ignoredGuaranteeId = '') {
  const normalized = normalizedPersonalDocument(value, type);
  if (!normalized) return false;
  if (type === 'cpf' && state.pessoas.some(person => normalizedPersonalDocument(person.cpf, 'cpf') === normalized)) return true;
  return state.garantias.some(guarantee => {
    if (guarantee.id === ignoredGuaranteeId) return false;
    const document = guaranteeDocument(guarantee);
    return document?.type === type && document.value === normalized;
  });
}

function refreshGuaranteeDocumentValidations() {
  guaranteesList.querySelectorAll('[data-field="cpf"],[data-field="cnpj"]').forEach(input => {
    const guarantee = state.garantias.find(item => item.id === input.closest('[data-id]')?.dataset.id);
    const type = input.dataset.field;
    const value = input.value.trim();
    let message = '';
    if (value && !(type === 'cpf' ? validateCpf(value) : validateCnpj(value))) message = `${type.toUpperCase()} inválido.`;
    else if (value && personalDocumentDuplicate(value, type, guarantee?.id)) message = `Este ${type.toUpperCase()} já foi adicionado como dirigente, representante ou garantia adicional.`;
    input.setCustomValidity(message);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    const status = input.closest('.repeat-card')?.querySelector('.guarantee-validation');
    if (status) {
      status.textContent = message;
      status.className = message ? 'inline-message guarantee-validation is-error' : 'inline-message guarantee-validation';
    }
  });
}

async function enterApplication(event) {
  event.preventDefault();
  clearMessage(loginMessage);
  const matricula = $('#employeeRegistration').value.trim().toUpperCase();
  const nome = formatPersonName($('#employeeName').value);
  const prefixo = $('#loginAgency').value;
  if (!prefixo) return showMessage(loginMessage, 'Selecione uma agência.', 'error');
  if (!/^F\d{7}$/.test(matricula)) return showMessage(loginMessage, 'Informe a matrícula no formato F seguido de sete números.', 'error');
  if (!hasFullName(nome)) return showMessage(loginMessage, 'Informe o nome e pelo menos um sobrenome do funcionário.', 'error');

  setButtonLoading($('#btnLogin'), true, 'Consultando agência...');
  await consultAgency(prefixo);
  setButtonLoading($('#btnLogin'), false, 'Acessar Central Empresas');
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
  resetManualCompanyFlow();

  if (!validateCnpj(cnpj)) {
    showMessage(companyMessage, 'Confira o CNPJ e os dígitos verificadores.', 'error');
    return;
  }

  setButtonLoading(btnConsultar, true, 'Consultando...');
  try {
    const data = await window.CnpjApi.requestSimples(cnpj);

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
      simplesOptante: data.opcao_pelo_simples,
      simplesDataOpcao: data.data_opcao_pelo_simples || '',
      simplesDataExclusao: data.data_exclusao_do_simples || '',
      simplesFonte: data.fonte_consulta || '',
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
    showMessage(companyMessage, '✅ Dados obtidos automaticamente', 'success');
  } catch (error) {
    clearMessage(companyMessage);
    manualCompanyPrompt.hidden = false;
  } finally {
    setButtonLoading(btnConsultar, false, 'Consultar CNPJ');
  }
}

function resetManualCompanyFlow() {
  manualCompanyPrompt.hidden = true;
  manualCompanyForm.hidden = true;
  clearMessage($('#manualCompanyMessage'));
  $('#manualCompanyName').value = '';
  $('#manualCompanyLegalType').value = '';
  $('#manualCompanyOtherType').value = '';
  $('#manualCompanyOtherTypeField').hidden = true;
  $('#manualCompanyAddress').value = '';
}

function saveManualCompany() {
  const cnpj = cleanDocument(cnpjInput.value);
  const name = $('#manualCompanyName').value.trim();
  const selectedType = $('#manualCompanyLegalType').value;
  const legalType = selectedType === 'Outro' ? $('#manualCompanyOtherType').value.trim() : selectedType;
  const address = $('#manualCompanyAddress').value.trim();
  const message = $('#manualCompanyMessage');
  clearMessage(message);
  if (!validateCnpj(cnpj)) {
    showMessage(message, 'Confira o CNPJ e os dígitos verificadores.', 'error');
    cnpjInput.focus();
    return;
  }
  if (!name || !legalType || !address) {
    showMessage(message, 'Preencha a razão social, o tipo de sociedade e o endereço completo.', 'error');
    return;
  }
  state.empresa = {
    cnpj,
    cnpjFormatado: formatCnpj(cnpj),
    razaoSocial: name,
    nomeFantasia: '',
    naturezaJuridica: legalType,
    tipoEstabelecimento: 'Informado manualmente',
    porte: '',
    situacao: 'Cadastro manual',
    simplesOptante: null,
    simplesDataOpcao: '',
    simplesDataExclusao: '',
    simplesFonte: '',
    preenchimentoManual: true,
    enderecoCompleto: address,
    endereco: { logradouro: address, numero: '', complemento: '', bairro: '', cep: '', municipio: '', uf: '' }
  };
  window.CentralData?.upsertCompany(state.empresa, { source: 'Preenchimento manual' });
  renderCompany();
  if (!$('#localEmpreendimento').value) $('#localEmpreendimento').value = address;
  manualCompanyPrompt.hidden = true;
  manualCompanyForm.hidden = true;
  showMessage(companyMessage, '✅ Dados preenchidos manualmente', 'success');
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

function formatApiDate(value) {
  if (!value) return '';
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value);
}

function renderCompany() {
  const company = state.empresa;
  $('#companySourceLabel').textContent = company.preenchimentoManual ? 'Dados informados manualmente' : 'Dados encontrados';
  $('#companyName').textContent = company.razaoSocial || 'Não informado';
  $('#companyCnpj').textContent = company.cnpjFormatado;
  $('#companyTradeName').textContent = company.nomeFantasia || 'Não informado';
  $('#companyLegalType').textContent = company.naturezaJuridica || 'Não informado';
  $('#companyBranchType').textContent = company.tipoEstabelecimento || 'Não informado';
  const source = company.simplesFonte ? ` · fonte: ${company.simplesFonte}` : '';
  $('#companySimples').textContent = company.simplesOptante === true
    ? `Optante${company.simplesDataOpcao ? ` desde ${formatApiDate(company.simplesDataOpcao)}` : ''}${source}`
    : company.simplesOptante === false
      ? `Não optante${company.simplesDataExclusao ? ` · exclusão em ${formatApiDate(company.simplesDataExclusao)}` : ''}${source}`
      : `Não foi possível confirmar${source}`;
  $('#companyAddress').textContent = company.enderecoCompleto || 'Não informado';
  $('#companyStatus').textContent = company.situacao || 'Consultado';
  $('#companyStatus').className = company.preenchimentoManual ? 'badge' : 'badge badge--success';
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
    $('#agencyLookupStatus').textContent = 'Prefixos e endereços carregados da base JavaScript versionada.';
  } catch (error) {
    select.innerHTML = '<option value="1031" selected>1031 - BONITO-MS</option>';
    renderAgency();
    $('#agencyLookupStatus').textContent = 'A lista completa não pôde ser carregada; Bonito permanece selecionada.';
  }
}

async function consultAgency(prefix) {
  if (!prefix) return;
  const status = $('#agencyLookupStatus');
  status.textContent = 'Carregando o endereço da base JavaScript...';
  try {
    const agencies = window.FCO_AGENCIES || [];
    const agency = agencies.find(a => String(a.prefixo) === String(prefix));
    if (!agency) throw new Error('Endereço não localizado.');
    state.agencia = agency;
    status.textContent = 'Endereço carregado da base JavaScript versionada.';
  } catch (error) {
    const option = $('#loginAgency').selectedOptions[0];
    state.agencia = { prefixo: prefix, nome: option?.textContent?.replace(/^\d+\s*-\s*/, '') || '', nomeCompleto: '', endereco: '', bairro: '', municipio: '', uf: 'MS', cep: '', fonte: 'Endereço pendente' };
    status.textContent = 'A agência não foi encontrada na base JavaScript versionada.';
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
  $('#agencySource').textContent = 'Base JavaScript versionada';
  $('#heroAgency').textContent = `${displayName.replace(/^Agência\s*/i, 'AGÊNCIA ')}`;
  if ($('#hubAgency')) $('#hubAgency').textContent = `${displayName.replace(/^Agência\s*/i, 'AGÊNCIA ')}`;
  $('#footerAgency').textContent = `Central Empresas · Agência ${agency.prefixo}`;
  if ($('#localEmissao') && agency.municipio && agency.uf) $('#localEmissao').value = `${agency.municipio}-${agency.uf}`;
}

function capturePerson() {
  clearMessage(personMessage);
  const hasSpouse = $('#personHasSpouse').checked;
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
  if (!hasFullName(person.nome)) return showMessage(personMessage, 'Informe o nome e pelo menos um sobrenome.', 'error');
  if (!validateCpf(person.cpf)) return showMessage(personMessage, 'Confira o CPF e os dígitos verificadores.', 'error');
  if (!person.dirigente && !person.representanteLegal) return showMessage(personMessage, 'Marque Dirigente ou Representante legal.', 'error');
  if (personalDocumentDuplicate(person.cpf, 'cpf')) {
    return showMessage(personMessage, 'Este CPF já foi adicionado como dirigente, representante ou garantia adicional.', 'error');
  }
  let spouse = null;
  if (hasSpouse) {
    spouse = {
      id: id(), conjugeDe: person.id, nome: formatPersonName($('#spouseName').value), cpf: $('#spouseCpf').value.trim(),
      nacionalidade: person.nacionalidade, estadoCivil: 'Casado(a)',
      logradouro: person.logradouro, numero: person.numero, complemento: person.complemento,
      bairro: person.bairro, municipio: person.municipio, uf: person.uf, cep: person.cep,
      dirigente: $('#spouseDirector').checked, representanteLegal: $('#spouseRepresentative').checked
    };
    if (!spouse.nome || !spouse.cpf) return showMessage(personMessage, 'Informe nome e CPF do cônjuge.', 'error');
    if (!hasFullName(spouse.nome)) return showMessage(personMessage, 'Informe o nome e pelo menos um sobrenome do cônjuge.', 'error');
    if (!validateCpf(spouse.cpf)) return showMessage(personMessage, 'Confira o CPF do cônjuge e os dígitos verificadores.', 'error');
    if (!spouse.dirigente && !spouse.representanteLegal) return showMessage(personMessage, 'Marque Dirigente ou Representante legal para o cônjuge.', 'error');
    if (normalizedPersonalDocument(spouse.cpf, 'cpf') === normalizedPersonalDocument(person.cpf, 'cpf') || personalDocumentDuplicate(spouse.cpf, 'cpf')) {
      return showMessage(personMessage, 'O CPF do cônjuge já foi informado como dirigente, representante ou garantia adicional.', 'error');
    }
  }
  state.pessoas.push(person, ...(spouse ? [spouse] : []));
  renderPeople();
  clearPersonEntry();
  showMessage(personMessage, spouse ? 'Pessoa e cônjuge adicionados à proposta com o mesmo endereço.' : 'Pessoa adicionada à proposta.', 'success');
}

function clearPersonEntry() {
  ['personName', 'personCpf', 'personCivilStatus', 'personStreet', 'personNumber', 'personComplement', 'personDistrict', 'personCity', 'personState', 'personCep']
    .forEach(identifier => { $(`#${identifier}`).value = ''; });
  $('#personNationality').value = 'Brasileira';
  $('#personDirector').checked = false;
  $('#personRepresentative').checked = false;
  $('#personHasSpouse').checked = false;
  $('#spouseName').value = '';
  $('#spouseCpf').value = '';
  $('#spouseDirector').checked = false;
  $('#spouseRepresentative').checked = false;
  $('#personCivilStatus').disabled = false;
  $('#personCivilStatus').value = '';
  delete $('#personCivilStatus').dataset.previousValue;
  $('#spouseFields').hidden = true;
  $('#personName').focus();
}

function syncSpouseFields() {
  const hasSpouse = $('#personHasSpouse').checked;
  const civilStatus = $('#personCivilStatus');
  $('#spouseFields').hidden = !hasSpouse;
  if (hasSpouse) {
    if (!civilStatus.disabled) civilStatus.dataset.previousValue = civilStatus.value;
    civilStatus.value = 'Casado(a)';
    civilStatus.disabled = true;
    $('#spouseName').focus();
  } else {
    civilStatus.disabled = false;
    if (civilStatus.dataset.previousValue !== undefined) {
      civilStatus.value = civilStatus.dataset.previousValue;
      delete civilStatus.dataset.previousValue;
    }
  }
}

function renderPeople() {
  peopleList.innerHTML = '';
  if (!state.pessoas.length) {
    renderEmpty(peopleList, 'Nenhuma pessoa adicionada.');
    renderAutomaticGuarantees();
    refreshGuaranteeDocumentValidations();
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
  refreshGuaranteeDocumentValidations();
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

function syncGuaranteeEntry() {
  const personal = $('#guaranteeCategory').value === 'pessoal';
  const company = $('#guaranteePersonType').value === 'pj';
  $('#guaranteePersonalFields').hidden = !personal;
  $('#guaranteeRealFields').hidden = personal;
  $('#guaranteeIndividualFields').hidden = !personal || company;
  $('#guaranteeCompanyFields').hidden = !personal || !company;
  $('#guaranteeDescriptionLabel').textContent = $('#guaranteeAssetType').value === 'bem_financiado' ? 'Item financiado' : 'Descrição/origem';
  clearMessage(guaranteeMessage);
}

function captureGuarantee() {
  clearMessage(guaranteeMessage);
  const category = $('#guaranteeCategory').value;
  const guarantee = {
    id: id(), categoria: category, pessoaTipo: $('#guaranteePersonType').value,
    nome: formatPersonName($('#guaranteeName').value), cpf: $('#guaranteeCpf').value.trim(),
    razaoSocial: $('#guaranteeCompanyName').value.trim(), cnpj: $('#guaranteeCnpj').value.trim(),
    bemTipo: $('#guaranteeAssetType').value, descricao: $('#guaranteeDescription').value.trim(),
    percentualVinculo: numberValue($('#guaranteePercentage').value)
  };
  if (category === 'pessoal') {
    const type = guarantee.pessoaTipo === 'pj' ? 'cnpj' : 'cpf';
    const name = guarantee.pessoaTipo === 'pj' ? guarantee.razaoSocial : guarantee.nome;
    const document = guarantee[type];
    if (!name || !document) return showMessage(guaranteeMessage, 'Informe o nome e o documento do garantidor.', 'error');
    if (guarantee.pessoaTipo === 'pf' && !hasFullName(guarantee.nome)) {
      return showMessage(guaranteeMessage, 'Informe o nome e pelo menos um sobrenome do garantidor.', 'error');
    }
    if (!(type === 'cpf' ? validateCpf(document) : validateCnpj(document))) {
      return showMessage(guaranteeMessage, `Confira o ${type.toUpperCase()} e os dígitos verificadores.`, 'error');
    }
    if (personalDocumentDuplicate(document, type)) {
      return showMessage(guaranteeMessage, `Este ${type.toUpperCase()} já foi adicionado como dirigente, representante ou garantia adicional.`, 'error');
    }
  } else if (!guarantee.descricao || guarantee.percentualVinculo <= 0 || guarantee.percentualVinculo > 100) {
    return showMessage(guaranteeMessage, 'Informe a descrição e um percentual de vínculo entre 0,01% e 100%.', 'error');
  }
  state.garantias.push(guarantee);
  renderGuarantees();
  clearGuaranteeEntry();
  showMessage(guaranteeMessage, 'Garantia adicionada à proposta.', 'success');
}

function clearGuaranteeEntry() {
  $('#guaranteeCategory').value = 'real';
  $('#guaranteePersonType').value = 'pf';
  ['guaranteeName', 'guaranteeCpf', 'guaranteeCompanyName', 'guaranteeCnpj', 'guaranteeDescription', 'guaranteePercentage']
    .forEach(identifier => { $`#${identifier}`.value = ''; });
  $('#guaranteeAssetType').value = 'bem_financiado';
  syncGuaranteeEntry();
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
    const assetLabels = { bem_financiado: 'Bem financiado', imovel: 'Imóvel', veiculo: 'Veículo', maquinas_equipamentos: 'Máquinas e equipamentos', recebiveis: 'Recebíveis' };
    card.innerHTML = `
      <div class="guarantee-head">
        <span class="guarantee-head__number">${String(index + 1).padStart(2, '0')}</span>
        <h3>Garantia adicional ${personal ? 'pessoal' : 'real'}</h3>
        <button class="icon-button" data-action="remove-guarantee" type="button" aria-label="Remover garantia">×</button>
      </div>
      <div class="person-summary">
        ${personal ? `
          <span><strong>Garantidor</strong>${escapeHtml(individual ? guarantee.nome : guarantee.razaoSocial)}</span>
          <span><strong>${individual ? 'CPF' : 'CNPJ'}</strong>${escapeHtml(individual ? guarantee.cpf : guarantee.cnpj)}</span>
          <span><strong>Tipo</strong>${individual ? 'Pessoa física' : 'Pessoa jurídica'}</span>
        ` : `
          <span><strong>Tipo de bem</strong>${escapeHtml(assetLabels[guarantee.bemTipo] || guarantee.bemTipo)}</span>
          <span class="person-summary__wide"><strong>Descrição</strong>${escapeHtml(guarantee.descricao)}</span>
          <span><strong>Percentual de vínculo</strong>${escapeHtml(formatMoneyValue(guarantee.percentualVinculo))}%</span>
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
    ? { maxTotal: 168, maxGrace: 48, maxRepayment: 144, label: 'Investimento · FCO Mulher' }
    : { maxTotal: 144, maxGrace: 24, maxRepayment: 120, label: 'Investimento' };
}

function termRuleErrors(operation) {
  const rule = getTermRule(operation.tipo, operation.fcoMulher);
  const standardRule = getTermRule(operation.tipo, false);
  const total = Number(operation.prazoTotalMeses || 0);
  const grace = Number(operation.carenciaMeses || 0);
  const errors = [];
  if (grace < 3 || grace % 3 !== 0) errors.push('A carência deve ser um múltiplo de 3, começando em 3 meses.');
  const requiresSpecialCondition = !operation.fcoMulher && (grace > standardRule.maxGrace || total > standardRule.maxTotal);
  if (requiresSpecialCondition) {
    errors.push(`O prazo ou a carência informados exigem a condição especial FCO Mulher. Ative a condição ou respeite os limites de ${standardRule.maxTotal} meses no total e ${standardRule.maxGrace} meses de carência.`);
  } else {
    if (grace > rule.maxGrace) errors.push(`A carência máxima para ${rule.label} é de ${rule.maxGrace} meses.`);
    if (total > rule.maxTotal) errors.push(`O prazo total máximo para ${rule.label} é de ${rule.maxTotal} meses.`);
  }
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
  const specialConditionError = !fcoMulher ? errors.find(error => error.includes('exigem a condição especial FCO Mulher')) || '' : '';
  $('#fcoMulher').setCustomValidity(specialConditionError);
  $('#fcoMulher').setAttribute('aria-invalid', specialConditionError ? 'true' : 'false');
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
  const registeredDocuments = new Set();
  const registerDocument = (value, type) => {
    const normalized = normalizedPersonalDocument(value, type);
    if (!normalized) return;
    const key = `${type}:${normalized}`;
    if (registeredDocuments.has(key)) errors.push(`O ${type.toUpperCase()} ${value} foi informado mais de uma vez entre dirigentes, representantes e garantias adicionais.`);
    else registeredDocuments.add(key);
  };
  if (!payload.acesso?.matricula || !payload.acesso?.nome) errors.push('Identificação do funcionário ausente. Entre novamente.');
  if (!payload.empresa) errors.push('Consulte um CNPJ válido antes de gerar.');
  if (payload.operacao.tipo === 'investimento' && !payload.operacao.linhaCredito) errors.push('Selecione a linha de crédito.');
  if (!payload.operacao.finalidade.trim()) errors.push('Informe a finalidade.');
  if (!payload.operacao.descricao.trim()) errors.push('Informe a descrição.');
  if (payload.operacao.valorOrcamento <= 0) errors.push('Informe o valor do orçamento.');
  if (payload.operacao.valorFinanciado <= 0) errors.push('Informe o valor a financiar.');
  if (payload.operacao.giroAssociado && payload.operacao.valorGiroAssociado <= 0) errors.push('Informe o valor do giro associado.');
  if (payload.operacao.valorFinanciado > payload.operacao.valorOrcamento) errors.push('O valor a financiar não pode superar o valor do orçamento.');
  if (payload.operacao.prazoTotalMeses <= 0) errors.push('Informe o prazo total.');
  errors.push(...termRuleErrors(payload.operacao));
  if (!validBankReference(payload.operacao.agenciaDebito, 4)) errors.push('Informe a agência para débito no formato XXXX-X.');
  if (!validBankReference(payload.operacao.contaDebito)) errors.push('Informe a conta para débito com até sete dígitos, hífen e dígito verificador.');
  if (!payload.agencia?.prefixo || !payload.agencia?.endereco) errors.push('Selecione uma agência responsável com endereço consultado.');
  if (!payload.pessoas.some(person => person.dirigente)) errors.push('Adicione ao menos um dirigente.');
  if (!payload.pessoas.some(person => person.representanteLegal)) errors.push('Adicione ao menos um representante legal.');
  payload.pessoas.forEach((person, index) => {
    if (!person.nome.trim() || !person.cpf.trim()) errors.push(`Complete nome e CPF da pessoa ${index + 1}.`);
    else if (!hasFullName(person.nome)) errors.push(`Informe nome e sobrenome da pessoa ${index + 1}.`);
    else if (!validateCpf(person.cpf)) errors.push(`Confira o CPF da pessoa ${index + 1} e os dígitos verificadores.`);
    registerDocument(person.cpf, 'cpf');
  });
  payload.operacao.garantias.forEach((guarantee, index) => {
    if (guarantee.categoria === 'pessoal') {
      const missing = guarantee.pessoaTipo === 'pf' ? !guarantee.nome.trim() || !guarantee.cpf.trim() : !guarantee.razaoSocial.trim() || !guarantee.cnpj.trim();
      if (missing) errors.push(`Complete a garantia pessoal ${index + 1}.`);
      const type = guarantee.pessoaTipo === 'pf' ? 'cpf' : 'cnpj';
      const value = guarantee[type];
      if (guarantee.pessoaTipo === 'pf' && guarantee.nome && !hasFullName(guarantee.nome)) errors.push(`Informe nome e sobrenome da garantia pessoal ${index + 1}.`);
      if (value && !(type === 'cpf' ? validateCpf(value) : validateCnpj(value))) errors.push(`Confira o ${type.toUpperCase()} da garantia pessoal ${index + 1} e os dígitos verificadores.`);
      registerDocument(value, type);
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

  const viewer = window.CentralDocuments?.openViewer();
  if (!viewer) {
    showMessage(formMessage, 'Autorize a abertura de pop-ups para visualizar e imprimir o dossiê.', 'error');
    return;
  }
  setButtonLoading(btnGenerate, true, 'Gerando documentos...');
  try {
    const dossier = await window.FCOReports.renderDossier(payload);
    viewer.deliver(dossier);
    showMessage(formMessage, 'Dossiê aberto em uma aba temporária para impressão. Nenhum arquivo HTML foi salvo no computador.', 'success');
  } catch (error) {
    viewer.close();
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
