'use strict';

const billingById = id => document.getElementById(id);
const BILLING_HISTORY_KEY = 'centralEmpresasBillingHistoryV1';
const BILLING_INDEXES = {
  '433': { code: '433', name: 'IPCA' },
  '191': { code: '191', name: 'IPA-DI' },
  '192': { code: '192', name: 'INCC-DI' },
  '188': { code: '188', name: 'INPC' },
  '189': { code: '189', name: 'IGP-M' },
  '4389': { code: '4389', name: 'CDI' },
  '4390': { code: '4390', name: 'SELIC' }
};
const billingCurrency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const billingMonthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
let billingCompanyLookup = { cnpj: '', simples: null };
let billingUpdateState = null;

function numberToWordsBr(num) {
  if (num === 0) return 'zero reais';
  const units = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  function toWords(n) {
    if (n === 0) return '';
    if (n === 100) return 'cem';
    let res = '';
    const h = Math.floor(n / 100);
    const rest = n % 100;
    if (h > 0) res += hundreds[h];
    if (h > 0 && rest > 0) res += ' e ';
    if (rest >= 10 && rest < 20) res += teens[rest - 10];
    else if (rest >= 20 || (rest > 0 && rest < 10)) {
      const t = Math.floor(rest / 10);
      const u = rest % 10;
      if (t > 0) res += tens[t];
      if (t > 0 && u > 0) res += ' e ';
      if (u > 0) res += units[u];
    }
    return res;
  }
  let parts = [];
  const billion = Math.floor(num / 1e9);
  const million = Math.floor((num % 1e9) / 1e6);
  const thousand = Math.floor((num % 1e6) / 1e3);
  const one = Math.floor(num % 1e3);
  const cents = Math.round((num - Math.floor(num)) * 100);
  if (billion > 0) parts.push(toWords(billion) + (billion === 1 ? ' bilhão' : ' bilhões'));
  if (million > 0) parts.push(toWords(million) + (million === 1 ? ' milhão' : ' milhões'));
  if (thousand > 0) parts.push(toWords(thousand) + ' mil');
  if (one > 0) parts.push(toWords(one));
  let result = '';
  if (parts.length > 0) {
    if (parts.length > 1) {
      const last = parts.pop();
      result = parts.join(', ') + ' e ' + last;
    } else {
      result = parts[0];
    }
    if (one === 0 && (million > 0 || billion > 0) && thousand === 0) result += ' de reais';
    else result += (Math.floor(num) === 1 ? ' real' : ' reais');
  }
  if (cents > 0) {
    if (result) result += ' e ';
    result += toWords(cents) + (cents === 1 ? ' centavo' : ' centavos');
  }
  return result;
}

function billingEscape(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function billingMoneyValue(value) {
  const normalized = String(value || '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function billingMoneyInput(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return (Number(digits || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function cleanBillingCnpj(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14);
}

function formatBillingCnpj(value) {
  const raw = cleanBillingCnpj(value);
  let result = raw.slice(0, 2);
  if (raw.length > 2) result += `.${raw.slice(2, 5)}`;
  if (raw.length > 5) result += `.${raw.slice(5, 8)}`;
  if (raw.length > 8) result += `/${raw.slice(8, 12)}`;
  if (raw.length > 12) result += `-${raw.slice(12, 14)}`;
  return result;
}

function validBillingCnpj(value) {
  const raw = cleanBillingCnpj(value);
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

function monthDate(value) {
  const [year, month] = String(value || '').split('-').map(Number);
  return year && month ? new Date(year, month - 1, 1, 12) : null;
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(value) {
  const date = typeof value === 'string' ? monthDate(value) : value;
  return date ? billingMonthName.format(date).replace(/^./, char => char.toUpperCase()) : '';
}

function historicalMonths(reference) {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), 1, 12);
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(end.getFullYear(), end.getMonth() - (11 - index), 1, 12);
    return { key: monthKey(date), label: monthLabel(date) };
  });
}

function splitMoney(total, weights) {
  const totalCents = Math.round(total * 100);
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  const values = weights.map(weight => Math.floor(totalCents * weight / weightTotal));
  let remainder = totalCents - values.reduce((sum, value) => sum + value, 0);
  for (let index = 0; remainder > 0; index = (index + 1) % values.length, remainder -= 1) values[index] += 1;
  return values.map(value => value / 100);
}

function applySalesSplit(months) {
  const cashPercent = Number(billingById('billingCashPercent').value);
  return months.map(month => {
    const cash = Math.round(month.total * cashPercent) / 100;
    return { ...month, cash, term: Math.round((month.total - cash) * 100) / 100 };
  });
}

function renderBillingDistribution() {
  if (!billingUpdateState?.months?.length) return;
  const months = billingUpdateState.months;
  billingById('billingMonthsTable').innerHTML = months.map(month => `<tr><td>${billingEscape(month.label)}</td><td>${billingCurrency.format(month.cash)}</td><td>${billingCurrency.format(month.term)}</td><td>${billingCurrency.format(month.total)}</td></tr>`).join('');
  const cashTotal = months.reduce((sum, month) => sum + month.cash, 0);
  const termTotal = months.reduce((sum, month) => sum + month.term, 0);
  billingById('billingCashTotal').textContent = billingCurrency.format(cashTotal);
  billingById('billingTermTotal').textContent = billingCurrency.format(termTotal);
  billingById('billingGrandTotal').textContent = billingCurrency.format(billingUpdateState.updated);
  billingById('billingUpdatedTotal').textContent = billingCurrency.format(billingUpdateState.updated);
  billingById('billingDistribution').hidden = false;
  billingById('billingGenerate').disabled = false;
}

function randomizeBillingMonths() {
  if (!billingUpdateState) return;
  const months = historicalMonths(billingUpdateState.reference);
  let activeMonthsCount = 12;
  
  if (billingCompanyLookup && billingCompanyLookup.founded) {
    const foundedDate = new Date(billingCompanyLookup.founded + 'T12:00:00Z');
    if (!isNaN(foundedDate.getTime())) {
      const today = new Date();
      const diffMonths = (today.getFullYear() - foundedDate.getFullYear()) * 12 + (today.getMonth() - foundedDate.getMonth());
      activeMonthsCount = Math.max(1, Math.min(12, diffMonths + 1));
    }
  }

  const startIndex = 12 - activeMonthsCount;
  const weights = months.map((_, index) => index >= startIndex ? 0.7 + Math.random() * 0.6 : 0);
  const totals = splitMoney(billingUpdateState.updated, weights);
  billingUpdateState.months = applySalesSplit(months.map((month, index) => ({ ...month, total: totals[index] })));
  renderBillingDistribution();
}

function updateSalesSplit() {
  const cashPercent = Number(billingById('billingCashPercent').value);
  const termPercent = 100 - cashPercent;
  billingById('billingCashLabel').textContent = `À vista: ${cashPercent}%`;
  billingById('billingTermLabel').textContent = `À prazo: ${termPercent}%`;
  billingById('billingCashBar').style.width = `${cashPercent}%`;
  billingById('billingTermBar').style.width = `${termPercent}%`;
  billingById('billingCashPercent').style.background = `linear-gradient(90deg, var(--blue) 0 ${cashPercent}%, #e5e6ef ${cashPercent}%)`;
  if (billingUpdateState?.months?.length) {
    billingUpdateState.months = applySalesSplit(billingUpdateState.months);
    renderBillingDistribution();
  }
}

function resetBillingUpdate() {
  billingUpdateState = null;
  billingById('billingDistribution').hidden = true;
  billingById('billingRandom').disabled = true;
  billingById('billingGenerate').disabled = true;
  billingById('billingForm').classList.remove('billing-form-ready');
  const message = billingById('billingUpdateMessage');
  message.textContent = '';
  message.className = 'inline-message';
}

function showBillingMessage(message, type = 'error') {
  const element = billingById('billingMessage');
  element.textContent = message;
  element.className = `inline-message is-${type}`;
}

function clearBillingMessage() {
  const element = billingById('billingMessage');
  element.textContent = '';
  element.className = 'inline-message';
}

function showBillingLookupMessage(message, type = 'error') {
  const element = billingById('billingLookupMessage');
  element.textContent = message;
  element.className = `inline-message is-${type}`;
}

function clearBillingLookupMessage() {
  const element = billingById('billingLookupMessage');
  element.textContent = '';
  element.className = 'inline-message';
}

async function consultBillingCompany() {
  const cnpj = cleanBillingCnpj(billingById('billingCnpj').value);
  const button = billingById('billingLookup');
  clearBillingLookupMessage();
  if (!validBillingCnpj(cnpj)) return showBillingLookupMessage('Confira o CNPJ e os dígitos verificadores.');
  if (!window.CnpjApi?.requestSimples) return showBillingLookupMessage('O serviço de consulta de CNPJ não foi carregado.');
  button.disabled = true;
  button.textContent = 'Consultando...';
  try {
    const data = await window.CnpjApi.requestSimples(cnpj);
    if (!data.razao_social) throw new Error('A consulta não retornou a razão social.');
    if (typeof data.opcao_pelo_simples !== 'boolean') throw new Error('Não foi possível confirmar a opção pelo Simples Nacional.');
    billingById('billingCnpj').value = formatBillingCnpj(cnpj);
    billingById('billingCompany').value = data.razao_social;
    billingCompanyLookup = { cnpj, simples: data.opcao_pelo_simples, founded: data.data_inicio_atividade };
    const status = data.opcao_pelo_simples ? 'Optante pelo Simples Nacional' : 'Não optante pelo Simples Nacional';
    showBillingLookupMessage(`Dados obtidos automaticamente. ${status}.`, 'success');
  } catch (error) {
    billingCompanyLookup = { cnpj: '', simples: null, founded: null };
    showBillingLookupMessage(error.message || 'Não foi possível consultar os dados do CNPJ.');
  } finally {
    button.disabled = false;
    button.textContent = 'Consultar';
  }
}

function brDate(date = new Date()) {
  return date.toLocaleDateString('pt-BR');
}

async function fetchBillingIndex(reference, code) {
  const ref = monthDate(reference);
  const today = new Date();
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1, 12);
  if (!ref || ref >= currentMonth) return [];
  const start = new Date(ref.getFullYear(), ref.getMonth() + 1, 1, 12);
  const startText = `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}/${start.getFullYear()}`;
  const endText = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  const officialUrl = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados?formato=json&dataInicial=${encodeURIComponent(startText)}&dataFinal=${encodeURIComponent(endText)}`;
  const proxyUrl = `/api/sgs?code=${code}&start=${encodeURIComponent(startText)}&end=${encodeURIComponent(endText)}`;
  let data = null;
  let lastError = null;
  for (const url of [proxyUrl, officialUrl]) {
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`resposta ${response.status}`);
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('json')) throw new Error('resposta não estruturada');
      const candidate = await response.json();
      if (!Array.isArray(candidate)) throw new Error('formato inesperado');
      data = candidate;
      break;
    } catch (error) { lastError = error; }
  }
  if (!data) throw new Error(`A fonte oficial não respondeu (${lastError?.message || 'falha de conexão'}).`);
  const referenceKey = monthKey(ref);
  return (Array.isArray(data) ? data : []).map(item => {
    const match = String(item.data || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const value = Number(String(item.valor || '').replace(',', '.'));
    if (!match || !Number.isFinite(value)) return null;
    const date = new Date(Number(match[3]), Number(match[2]) - 1, 1, 12);
    return { key: monthKey(date), label: monthLabel(date), value };
  }).filter(item => item && item.key > referenceKey).sort((a, b) => a.key.localeCompare(b.key));
}

function calculateBilling(original, indices) {
  const factor = indices.reduce((current, index) => current * (1 + index.value / 100), 1);
  const updated = Math.round(original * factor * 100) / 100;
  return { factor, percentage: (factor - 1) * 100, updated };
}

function billingPlace() {
  try {
    const saved = JSON.parse(sessionStorage.getItem('centralFcoSessionV1') || 'null');
    const agency = saved?.agencia;
    if (agency?.municipio && agency?.uf) return `${agency.municipio}-${agency.uf}`;
    if (agency?.nome) return agency.nome;
  } catch (_) { /* sessão indisponível */ }
  return 'Local não informado';
}

function longBrDate(date = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

async function updateBillingValues() {
  clearBillingMessage();
  const updateMessage = billingById('billingUpdateMessage');
  updateMessage.textContent = '';
  updateMessage.className = 'inline-message';
  const cnpj = cleanBillingCnpj(billingById('billingCnpj').value);
  const original = billingMoneyValue(billingById('billingAnnual').value);
  const reference = billingById('billingReference').value;
  const index = BILLING_INDEXES[billingById('billingIndex').value];
  const isFirstTime = billingById('billingFirstTime').checked;
  const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12);
  if (billingCompanyLookup.cnpj !== cnpj || typeof billingCompanyLookup.simples !== 'boolean') return showBillingMessage('Consulte o CNPJ antes de atualizar o faturamento.');
  if (!original) return showBillingMessage('Informe o valor do último faturamento.');
  const button = billingById('billingUpdate');

  if (isFirstTime) {
    billingUpdateState = { original, reference: monthKey(currentMonth), index: null, indices: [], factor: 1, percentage: 0, updated: original, months: [] };
    randomizeBillingMonths();
    billingById('billingRandom').disabled = false;
    billingById('billingForm').classList.add('billing-form-ready');
    updateMessage.textContent = `Faturamento distribuído pelo valor bruto (${billingCurrency.format(original)}).`;
    updateMessage.className = 'inline-message is-success';
    return;
  }

  const referenceDate = monthDate(reference);
  if (!referenceDate) return showBillingMessage('Informe a referência do último faturamento.');
  if (referenceDate >= currentMonth) return showBillingMessage('A referência deve ser um período fechado anterior ao mês atual.');
  
  button.disabled = true;
  button.textContent = 'Atualizando...';
  try {
    const indices = await fetchBillingIndex(reference, index.code);
    const calculation = calculateBilling(original, indices);
    billingUpdateState = { original, reference, index, indices, ...calculation, months: [] };
    randomizeBillingMonths();
    billingById('billingRandom').disabled = false;
    billingById('billingForm').classList.add('billing-form-ready');
    const lastPeriod = indices.length ? indices[indices.length - 1].label : 'nenhuma competência posterior publicada';
    updateMessage.textContent = `Faturamento atualizado para ${billingCurrency.format(calculation.updated)}. Período final: ${lastPeriod}.`;
    updateMessage.className = 'inline-message is-success';
  } catch (error) {
    if (window.confirm(`Não foi possível atualizar pelo índice oficial. ${error.message || 'Verifique a conexão.'}\n\nDeseja gerar a distribuição pelo valor do faturamento bruto informado?`)) {
      billingUpdateState = { original, reference, index, indices: [], factor: 1, percentage: 0, updated: original, months: [] };
      randomizeBillingMonths();
      billingById('billingRandom').disabled = false;
      billingById('billingForm').classList.add('billing-form-ready');
      updateMessage.textContent = `Faturamento distribuído pelo valor bruto (${billingCurrency.format(original)}).`;
      updateMessage.className = 'inline-message is-success';
    } else {
      resetBillingUpdate();
      showBillingMessage(`Não foi possível atualizar o faturamento. ${error.message || 'Verifique a conexão e tente novamente.'}`);
    }
  } finally {
    button.disabled = false;
    button.textContent = 'Atualizar';
  }
}

async function logoDataUrl() {
  try {
    const response = await fetch('logo02.png');
    const blob = await response.blob();
    return await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob); });
  } catch (_) { return 'logo02.png'; }
}

function reportHtml(data, logo) {
  const period = data.indices.length ? `${monthLabel(data.reference)} a ${data.indices[data.indices.length - 1].label}` : `${monthLabel(data.reference)} (sem competência posterior publicada)`;
  const cashPercent = Number(billingById('billingCashPercent').value);
  const termPercent = 100 - cashPercent;
  const cashTotal = data.months.reduce((sum, month) => sum + month.cash, 0);
  const termTotal = data.months.reduce((sum, month) => sum + month.term, 0);
  const monthRows = data.months.map(month => `<tr><td>${billingEscape(month.label)}</td><td>${billingCurrency.format(month.cash)}</td><td>${billingCurrency.format(month.term)}</td><td>${billingCurrency.format(month.total)}</td></tr>`).join('');
  const placeAndDate = `${billingPlace()}, ${longBrDate()}`;
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relação de Faturamento - ${billingEscape(data.company)}</title><style>
  @page{size:A4;margin:12mm 15mm 16mm}*{box-sizing:border-box}body{margin:0;background:#eef0f6;color:#17182d;font:11px Arial,sans-serif}.sheet{width:210mm;min-height:297mm;margin:16px auto;padding:13mm 16mm 18mm;background:#fff;position:relative;box-shadow:0 14px 40px #0002}.header{display:flex;align-items:center;justify-content:space-between;padding-bottom:10px;border-bottom:2px solid #3333bd}.header img{width:42px}.header span{font-size:9px;letter-spacing:.12em;color:#55586c}.kicker{margin:18px 0 4px;color:#3333bd;font-size:9px;font-weight:800;letter-spacing:.12em}.title{margin:0 0 10px;font-size:22px}.company{display:grid;grid-template-columns:2fr 1fr 1.35fr;gap:7px}.box{padding:9px 11px;border:1px solid #d6daea;border-radius:8px}.box small,.summary small{display:block;margin-bottom:3px;color:#64677b;font-size:7px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}.box strong{font-size:10px}.summary-grid{display:grid;grid-template-columns:1fr;gap:7px;margin-top:10px}.summary{padding:9px;border-radius:8px;background:#f3f4fb}.summary strong{font-size:10px}.section-title{margin:15px 0 7px;color:#3333bd;font-size:12px}table{width:100%;border-collapse:collapse;font-size:10px}th{background:#e8e9ff;color:#24249a;text-align:right}th:first-child,td:first-child{text-align:left}th,td{padding:6px 8px;border:1px solid #cfd3e3;text-align:right}tbody tr:nth-child(even){background:#fafbff}tfoot th{border-top:2px solid #3333bd}.split-summary{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-top:9px}.tax{margin-top:9px;padding:8px 10px;border-left:3px solid #fcfc30;background:#fffde5}.tax strong{color:#24249a}.note{margin-top:9px;padding:8px 10px;border-radius:6px;background:#f5f6fb;font-size:7px;line-height:1.35}.place-date{margin-top:12px;font-size:9px}.signature{width:68%;margin:34px auto 0;text-align:center}.signature__line{border-top:1px solid #17182d;padding-top:5px}.signature strong,.signature span{display:block}.signature span{margin-top:2px;font-size:8px}.footer{position:absolute;left:16mm;right:16mm;bottom:8mm;padding-top:6px;border-top:1px solid #bcc1d2;color:#63667a;font-size:6px;display:flex;justify-content:space-between}.print{position:fixed;right:24px;bottom:24px;padding:13px 18px;border:0;border-radius:9px;background:#3333bd;color:#fff;font-weight:700;cursor:pointer}@media print{body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{width:auto;min-height:auto;margin:0;padding:0;box-shadow:none;position:relative}.print{display:none}.footer{position:absolute;left:16mm;right:16mm;bottom:0}}
  </style></head><body><main class="sheet"><header class="header"><img src="${logo}" alt="Banco do Brasil"><span>RELAÇÃO DE FATURAMENTO</span></header><div class="kicker">PESSOA JURÍDICA</div><h1 class="title">Relação de Faturamento - Últimos 12 meses</h1><p style="margin:0 0 14px;font-size:10px;line-height:1.4">Declaramos, para os devidos fins, que o faturamento da empresa identificada abaixo, conforme registros fiscais regularmente apresentados, corresponde aos valores demonstrados a seguir.</p><section class="company"><div class="box"><small>Razão social</small><strong>${billingEscape(data.company)}</strong></div><div class="box"><small>CNPJ</small><strong>${billingEscape(data.cnpj)}</strong></div><div class="box"><small>Regime tributário</small><strong>${billingEscape(data.simpleLabel)}</strong></div></section><section class="summary-grid"><div class="summary"><small>Faturamento atual</small><strong>${billingCurrency.format(data.updated)} (${numberToWordsBr(data.updated)})</strong></div></section><h2 class="section-title">Detalhamento do faturamento</h2><table><thead><tr><th>Mês/ano</th><th>À vista - R$</th><th>À prazo - R$</th><th>Total - R$</th></tr></thead><tbody>${monthRows}</tbody><tfoot><tr><th>Total</th><th>${billingCurrency.format(cashTotal)}</th><th>${billingCurrency.format(termTotal)}</th><th>${billingCurrency.format(data.updated)}</th></tr></tfoot></table><section class="split-summary"><div class="box"><small>Vendas à vista</small><strong>${cashPercent}%</strong></div><div class="box"><small>Vendas à prazo</small><strong>${termPercent}%</strong></div></section><p class="place-date">${billingEscape(placeAndDate)}</p><section class="signature"><div class="signature__line"><strong>${billingEscape(data.company)}</strong><span>${billingEscape(data.cnpj)}</span></div><p style="margin-top:14px;font-size:8px;color:#64677b">Obs.: Dispensada a assinatura do contador para faturamento até R$ 4.800.000,00.</p></section><footer class="footer"><span>Central de Atendimento BB: 4004 0001 / 0800 729 0001</span><span>Documento gerado pela Central Empresas</span></footer></main><button class="print" onclick="window.print()">Imprimir / salvar PDF</button></body></html>`;
}

function saveBillingHistory(data) {
  const item = { company: data.company, cnpj: data.cnpj, date: brDate(), original: data.original, updated: data.calculation.updated, percentage: data.calculation.percentage };
  try {
    const current = JSON.parse(localStorage.getItem(BILLING_HISTORY_KEY) || '[]');
    localStorage.setItem(BILLING_HISTORY_KEY, JSON.stringify([item, ...current].slice(0, 10)));
  } catch (_) { /* histórico opcional */ }
  renderBillingHistory();
}

function renderBillingHistory() {
  let history = [];
  try { history = JSON.parse(localStorage.getItem(BILLING_HISTORY_KEY) || '[]'); } catch (_) { history = []; }
  billingById('billingHistoryList').innerHTML = history.length ? history.map(item => `<article><div><strong>${billingEscape(item.company)}</strong><small>${billingEscape(item.cnpj)} · ${billingEscape(item.date)}</small></div><span>${billingCurrency.format(item.original)} → <b>${billingCurrency.format(item.updated)}</b></span></article>`).join('') : '<p>Nenhuma atualização gerada.</p>';
}

function clearBillingHistory() {
  if (window.confirm('Tem certeza de que deseja limpar todo o histórico de relatórios desta estação?')) {
    localStorage.removeItem(BILLING_HISTORY_KEY);
    renderBillingHistory();
  }
}

async function submitBilling(event) {
  event.preventDefault();
  clearBillingMessage();
  const cnpj = cleanBillingCnpj(billingById('billingCnpj').value);
  const company = billingById('billingCompany').value.trim();
  if (!billingUpdateState?.months?.length) return showBillingMessage('Atualize e distribua o faturamento antes de gerar o relatório.');
  if (billingCompanyLookup.cnpj !== cnpj || typeof billingCompanyLookup.simples !== 'boolean') return showBillingMessage('Consulte novamente o CNPJ antes de gerar o relatório.');
  const preview = window.open('', '_blank');
  if (!preview) return showBillingMessage('O navegador bloqueou a nova janela. Permita pop-ups e tente novamente.');
  preview.document.write('<!doctype html><title>Gerando relatório...</title><p style="font:16px Arial;padding:30px">Preparando a relação de faturamento...</p>');
  const button = billingById('billingGenerate');
  button.disabled = true;
  button.textContent = 'Gerando relatório...';
  try {
    const simpleLabel = billingCompanyLookup.simples ? 'Optante pelo Simples Nacional' : 'Não optante pelo Simples Nacional';
    const data = { cnpj: formatBillingCnpj(cnpj), company, simpleLabel, ...billingUpdateState, calculation: { updated: billingUpdateState.updated, percentage: billingUpdateState.percentage } };
    const logo = await logoDataUrl();
    preview.document.open(); preview.document.write(reportHtml(data, logo)); preview.document.close();
    billingById('billingResult').hidden = false;
    billingById('billingResult').innerHTML = `<strong>Relatório preparado</strong><span>${billingCurrency.format(data.updated)}</span><small>${simpleLabel} · ${data.months.length} competências distribuídas.</small>`;
    saveBillingHistory(data);
    showBillingMessage('Relatório de faturamento gerado com sucesso.', 'success');
  } catch (error) {
    preview.close();
    showBillingMessage(error.message || 'Não foi possível gerar o relatório.');
  } finally {
    button.disabled = false;
    button.innerHTML = '<span aria-hidden="true">↗</span> Gerar relatório de faturamento';
  }
}

function openUtilityPanel(panelId) {
  document.querySelectorAll('.utility-panel').forEach(panel => { panel.hidden = panel.id !== panelId; });
  document.querySelectorAll('[data-open-tool]').forEach(button => button.classList.toggle('is-active', button.dataset.openTool === panelId));
  const panel = billingById(panelId);
  if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.querySelectorAll('[data-open-tool]').forEach(button => button.addEventListener('click', event => {
  event.preventDefault();
  openUtilityPanel(button.dataset.openTool);
}));

const utilitiesSource = new URLSearchParams(location.search).get('from');
if (utilitiesSource === 'web' && !location.pathname.includes('/.centralfco-work/')) {
  billingById('utilitiesBackBrand').href = 'web/index.html';
  billingById('utilitiesBackLink').href = 'web/index.html';
}

billingById('billingCnpj').addEventListener('input', event => {
  event.target.value = formatBillingCnpj(event.target.value);
  if (billingCompanyLookup.cnpj !== cleanBillingCnpj(event.target.value)) {
    billingCompanyLookup = { cnpj: '', simples: null, founded: null };
    billingById('billingCompany').value = '';
    clearBillingLookupMessage();
    resetBillingUpdate();
  }
});
billingById('billingLookup').addEventListener('click', consultBillingCompany);
billingById('billingAnnual').addEventListener('input', event => { event.target.value = billingMoneyInput(event.target.value); resetBillingUpdate(); });
billingById('billingReference').addEventListener('change', resetBillingUpdate);
billingById('billingIndex').addEventListener('change', resetBillingUpdate);
billingById('billingFirstTime').addEventListener('change', event => {
  const isChecked = event.target.checked;
  billingById('billingReference').disabled = isChecked;
  billingById('billingIndex').disabled = isChecked;
  billingById('billingUpdate').textContent = isChecked ? 'Distribuir' : 'Atualizar';
  resetBillingUpdate();
});
billingById('billingUpdate').addEventListener('click', updateBillingValues);
billingById('billingRandom').addEventListener('click', randomizeBillingMonths);
billingById('billingCashPercent').addEventListener('input', updateSalesSplit);
billingById('billingForm').addEventListener('submit', submitBilling);
const historyButton = billingById('billingClearHistory');
if (historyButton) historyButton.addEventListener('click', clearBillingHistory);

const defaultReference = new Date();
defaultReference.setMonth(defaultReference.getMonth() - 1);
billingById('billingReference').value = monthKey(defaultReference);
updateSalesSplit();
renderBillingHistory();
