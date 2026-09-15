(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  let data = null, selected = new Set(), columns = [], workbook = null, filters = [], page = 0, fileVersion = 0, currentPortfolio = [];
  const PAGE_SIZE = 50;
  const MODEL_KEY = "centralScannerModelsV1";
  const PIPELINE_KEY = "centralPipelineV1";
  const BI_KEY = "centralScannerBiV1";
  const MAPPING_FIELDS = [
    ['mci', 'MCI'], ['client', 'Cliente ou razão social'], ['portfolio', 'Carteira'],
    ['revenue', 'Faturamento'], ['creditLimit', 'Limite de crédito'], ['pixVolume', 'Volume PIX'],
    ['hasCredit', 'Possui crédito?'], ['hasInsurance', 'Possui seguro?'], ['hasConsortium', 'Possui consórcio?']
  ];
  const element = (tag, text, className) => {
    const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node;
  };
  const visible = () => data.rows.map((row, index) => ({ row, index })).filter(({ row }) =>
    Object.values(row).some(value => value.toLocaleLowerCase('pt-BR').includes($('search').value.toLocaleLowerCase('pt-BR')))
    && filters.every(filter => CentralScanner.matches(row, data.typedRows?.[index], filter)));
  const chosen = () => data.rows.filter((_, index) => selected.has(index));
  const invalidate = () => { $('opportunityResults').hidden = true; currentPortfolio = []; };
  function render() {
    invalidate();
    const active = columns.filter(column => column.enabled);
    const header = element('tr'); header.append(element('th', 'Selecionar'));
    for (const column of active) header.append(element('th', column.name));
    $('tableHead').replaceChildren(header);
    $('tableBody').replaceChildren();
    const matches = visible();
    page = Math.min(page, Math.max(0, Math.ceil(matches.length / PAGE_SIZE) - 1));
    for (const { row, index } of matches.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)) {
      const tr = element('tr'), td = element('td'), check = element('input');
      check.type = 'checkbox'; check.checked = selected.has(index); check.setAttribute('aria-label', `Selecionar registro ${index + 1}`);
      check.addEventListener('change', () => { if (check.checked) selected.add(index); else selected.delete(index); invalidate(); updateCount(matches.length); });
      td.append(check); tr.append(td);
      for (const column of active) tr.append(element('td', row[column.key]));
      $('tableBody').append(tr);
    }
    updateCount(matches.length);
    $("previousPage").disabled = page === 0;
    $("nextPage").disabled = (page + 1) * PAGE_SIZE >= matches.length;
  }
  function updateCount(matches) { $('count').textContent = `${data.rows.length} registros · ${matches} na pesquisa · ${selected.size} selecionados · página ${page + 1}`; }
  function mount() {
    if (data.rows.length > 5000) throw new Error('Nesta primeira versão, selecione até 5.000 registros.');
    selected = new Set(data.rows.map((_, index) => index));
    const pipeline = CentralScanner.REQUIRED.every(key => data.headers.includes(key));
    columns = data.headers.map(key => ({ key, name: key === 'MCl' ? 'MCI' : key, enabled: true, required: pipeline && CentralScanner.REQUIRED.includes(key) }));
    filters = []; page = 0; $('search').value = ''; $('columnSearch').value = ''; $('filters').textContent = '';
    $('filterColumn').replaceChildren(...data.headers.map(key => { const option = element('option', key); option.value = key; return option; }));
    $('preview').disabled = !pipeline;
    $('message').textContent = `${data.rows.length} registros · ${data.headers.length} colunas${data.sheet ? ' · aba ' + data.sheet : ''}. ${pipeline ? 'Pipeline disponível.' : 'Relatório disponível para seleção, filtros e exportação.'} ${(data.warnings || []).join(' ')}`;
    $('selection').hidden = false; drawColumns(); drawMappings(); render();
  }
  function drawMappings() {
    $('semanticMappings').replaceChildren();
    for (const [field, labelText] of MAPPING_FIELDS) {
      const label = element('label', labelText), select = element('select'); select.id = `mapping-${field}`;
      const empty = element('option', 'Não mapear'); empty.value = ''; select.append(empty);
      for (const header of data.headers) { const option = element('option', header); option.value = header; select.append(option); }
      const exact = data.headers.find(header => header.toLocaleLowerCase('pt-BR') === labelText.toLocaleLowerCase('pt-BR'));
      const safeDefaults = { mci: ['MCI', 'MCl'], client: ['Razão Social', 'Cliente'], portfolio: ['Carteira'] };
      select.value = exact || safeDefaults[field]?.find(name => data.headers.includes(name)) || '';
      select.addEventListener('change', invalidate); label.append(select); $('semanticMappings').append(label);
    }
  }
  function drawColumns() {
    $('columns').replaceChildren();
    for (const column of columns) {
      if (!`${column.key} ${column.name}`.toLocaleLowerCase('pt-BR').includes($('columnSearch').value.toLocaleLowerCase('pt-BR'))) continue;
      const label = element('label'), check = element('input'), rename = element('input');
      check.type = 'checkbox'; check.checked = column.enabled; check.disabled = column.required;
      check.setAttribute('aria-label', `Incluir ${column.key}`);
      rename.value = column.name; rename.setAttribute('aria-label', `Nome de exportação para ${column.key}`);
      check.addEventListener('change', () => { column.enabled = check.checked; render(); });
      rename.addEventListener('input', () => { column.name = rename.value.trim(); render(); });
      label.append(check, element('span', column.key), rename); $('columns').append(label);
    }
  }
  function applySheet() {
    try {
      const sheet = workbook.sheets[Number($('sheet').value)];
      data = CentralXlsx.table(sheet, Number($('headerStart').value), Number($('headerDepth').value));
      mount();
    } catch (error) { data = null; $('selection').hidden = true; invalidate(); $('message').textContent = error.message; }
  }
  $('file').addEventListener('change', async () => {
    const version = ++fileVersion;
    data = null; workbook = null; selected.clear(); $('selection').hidden = true; $('excelOptions').hidden = true; invalidate();
    const file = $('file').files[0]; if (!file) return;
    $('message').textContent = 'Lendo arquivo…';
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Selecione um arquivo de até 5 MB.');
      if (/\.xlsx$/i.test(file.name)) {
        const loaded = await CentralXlsx.read(await file.arrayBuffer());
        if (version !== fileVersion) return;
        workbook = loaded;
        $('sheet').replaceChildren(...workbook.sheets.map((sheet, index) => { const option = element('option', sheet.name); option.value = index; return option; }));
        $('headerStart').value = 1; $('headerDepth').value = workbook.sheets[0].headerDepth;
        $('excelOptions').hidden = false; applySheet();
      } else if (/\.csv$/i.test(file.name)) {
        const content = await file.text(); if (version !== fileVersion) return;
        data = CentralScanner.parseCsv(content); mount();
      } else throw new Error('Escolha um arquivo XLSX ou CSV.');
    } catch (error) { if (version === fileVersion) { data = null; $('selection').hidden = true; $('message').textContent = error.message; } }
  });
  $('sheet').addEventListener('change', () => { $('headerStart').value = 1; $('headerDepth').value = workbook.sheets[Number($('sheet').value)].headerDepth; applySheet(); });
  $('applyHeaders').addEventListener('click', applySheet);
  $('previousPage').addEventListener('click', () => { page--; render(); });
  $('nextPage').addEventListener('click', () => { page++; render(); });
  $('allColumns').addEventListener('click', () => { columns.forEach(column => { column.enabled = true; }); drawColumns(); render(); });
  $('columnSearch').addEventListener('input', drawColumns);
  $('noColumns').addEventListener('click', () => { columns.forEach(column => { column.enabled = column.required; }); drawColumns(); render(); });
  function showFilters() { $('filters').textContent = filters.map(filter => `${filter.column}: ${filter.operator} ${filter.value}${filter.upper ? ' — ' + filter.upper : ''}`).join(' · '); }
  $('addFilter').addEventListener('click', () => {
    const filter = { column: $('filterColumn').value, operator: $('filterOperator').value, value: $('filterValue').value, upper: $('filterUpper').value };
    try {
      if (['gt', 'lt', 'between'].includes(filter.operator)) { CentralScanner.filterNumber(filter.value); if (filter.operator === 'between' && CentralScanner.filterNumber(filter.upper) < CentralScanner.filterNumber(filter.value)) throw new Error('O limite superior deve ser maior ou igual ao inferior.'); }
      if (['before', 'after'].includes(filter.operator)) CentralScanner.date(filter.value, true);
      filters.push(filter); page = 0; showFilters(); render();
    } catch (error) { $('message').textContent = error.message; }
  });
  $('clearFilters').addEventListener('click', () => { filters = []; page = 0; showFilters(); render(); });
  const readModels = () => { try { const models = JSON.parse(localStorage.getItem(MODEL_KEY) || '{}'); return models && typeof models === 'object' && !Array.isArray(models) ? models : {}; } catch (_) { return {}; } };
  function listModels() {
    $('model').replaceChildren(element('option', 'Escolha um modelo'));
    $('model').firstChild.value = '';
    for (const name of Object.keys(readModels())) { const option = element('option', name); option.value = name; $('model').append(option); }
  }
  $('saveModel').addEventListener('click', () => {
    const name = $('modelName').value.trim(); if (!name) { $('message').textContent = 'Informe um nome para o modelo.'; return; }
    try {
      const models = readModels();
      Object.defineProperty(models, name, { value: { columns, filters, headerStart: Number($('headerStart').value), headerDepth: Number($('headerDepth').value), semanticMappings: mappingValues(), opportunitySettings: settingValues(), portfolioSize: $('portfolioSize').value }, enumerable: true, configurable: true });
      localStorage.setItem(MODEL_KEY, JSON.stringify(models)); listModels(); $('message').textContent = 'Modelo salvo com colunas, filtros e regras de oportunidade. Os registros não são salvos.';
    } catch (_) { $('message').textContent = 'Não foi possível salvar o modelo neste navegador.'; }
  });
  $('loadModel').addEventListener('click', () => {
    const model = readModels()[$('model').value]; if (!model || !Array.isArray(model.columns) || !Array.isArray(model.filters)) return;
    if (workbook) {
      $('headerStart').value = model.headerStart; $('headerDepth').value = model.headerDepth; applySheet(); if (!data) return;
    }
    const missing = model.columns.filter(column => column.enabled && !data.headers.includes(column.key));
    if (missing.length || model.filters.some(filter => !data.headers.includes(filter.column))) { $('message').textContent = 'Este arquivo não tem todas as colunas usadas pelo modelo; confira a estrutura.'; return; }
    columns.forEach(column => { const saved = model.columns.find(item => item.key === column.key); column.enabled = column.required || !!saved?.enabled; column.name = saved?.name || column.key; });
    filters = model.filters.map(filter => ({ ...filter })); page = 0; drawColumns(); showFilters();
    if (model.semanticMappings && typeof model.semanticMappings === 'object') {
      for (const [field] of MAPPING_FIELDS) { const saved = model.semanticMappings[field]; if (saved && data.headers.includes(saved)) $(`mapping-${field}`).value = saved; }
    }
    const settings = model.opportunitySettings;
    if (settings && typeof settings === 'object') {
      const values = { minRevenue: settings.minRevenue, maxCreditLimit: settings.maxCreditLimit, maxPix: settings.maxPix, minConsortiumRevenue: settings.minConsortiumRevenue, weightCredit: settings.weights?.credit, weightPix: settings.weights?.pix, weightInsurance: settings.weights?.insurance, weightConsortium: settings.weights?.consortium };
      for (const [id, value] of Object.entries(values)) if (value != null) $(id).value = value;
    }
    if (['10', '20', '30', '50', '100'].includes(String(model.portfolioSize))) $('portfolioSize').value = String(model.portfolioSize);
    render(); $('message').textContent = 'Modelo aplicado. Confira as colunas, os filtros e as regras de oportunidade.';
  });
  listModels();
  $('search').addEventListener('input', () => { if (data) { page = 0; render(); } });
  $('selectVisible').addEventListener('click', () => { visible().forEach(({ index }) => selected.add(index)); render(); });
  $('clearVisible').addEventListener('click', () => { visible().forEach(({ index }) => selected.delete(index)); render(); });
  $('clearAllRows').addEventListener('click', () => { selected.clear(); render(); });
  $('preview').addEventListener('click', () => {
    const checked = CentralScanner.validate(chosen());
    const invalid = checked.filter(record => record.errors.length);
    if (!checked.length) { $('message').textContent = 'Selecione ao menos uma operação para enviar ao Pipeline.'; return; }
    if (invalid.length) {
      const first = invalid[0];
      $('message').textContent = `${invalid.length} operação(ões) com erro. Proposta ${first.operation.proposal || first.sourceRow}: ${first.errors.join(' ')}`;
      return;
    }
    try {
      sessionStorage.setItem(PIPELINE_KEY, JSON.stringify({ version: 1, createdAt: new Date().toISOString(), sourceName: $('file').files[0]?.name || 'Scanner', operations: checked.map(record => record.operation) }));
      window.location.href = 'pipeline.html';
    } catch (_) { $('message').textContent = 'Não foi possível transferir as operações nesta sessão. Reduza a seleção e tente novamente.'; }
  });
  const mappingValues = () => Object.fromEntries(MAPPING_FIELDS.map(([field]) => [field, $(`mapping-${field}`).value]));
  const settingValues = () => ({
    minRevenue: $('minRevenue').value, maxCreditLimit: $('maxCreditLimit').value, maxPix: $('maxPix').value,
    minConsortiumRevenue: $('minConsortiumRevenue').value,
    weights: { credit: $('weightCredit').value, pix: $('weightPix').value, insurance: $('weightInsurance').value, consortium: $('weightConsortium').value }
  });
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  $('analyze').addEventListener('click', () => {
    if (!selected.size) { $('message').textContent = 'Selecione pelo menos um registro para analisar.'; return; }
    const analysis = CentralScanner.analyzeOpportunities(chosen(), mappingValues(), settingValues());
    $('ruleStatus').replaceChildren();
    for (const rule of analysis.rules) {
      const status = element('span', rule.enabled ? `${rule.label}: ativa` : `${rule.label}: falta mapear ${rule.missing.join(' e ')}`, rule.enabled ? '' : 'is-disabled');
      $('ruleStatus').append(status);
    }
    const size = Number($('portfolioSize').value);
    currentPortfolio = analysis.records.slice(0, size);
    const presentationRecords = analysis.records.map(({ source, ...record }) => record);
    const presentationPortfolio = currentPortfolio.map(({ source, ...record }) => record);
    try {
      sessionStorage.setItem(BI_KEY, JSON.stringify({ version: 1, createdAt: new Date().toISOString(), sourceName: $('file').files[0]?.name || 'Scanner', analyzedCount: chosen().length, rules: analysis.rules, records: presentationRecords, portfolio: presentationPortfolio }));
    } catch (_) { $('message').textContent = 'A análise foi concluída, mas a apresentação BI não pôde ser armazenada nesta sessão.'; }
    $('opportunitySummary').textContent = `${analysis.records.length} registros com oportunidade · ${currentPortfolio.length} priorizados na carteira. O ranking soma apenas os pesos das regras comprovadas pelos campos mapeados.`;
    const head = element('tr'); for (const title of ['Prioridade', 'Cliente', 'MCI', 'Carteira', 'Faturamento', 'Oportunidades e evidências']) head.append(element('th', title));
    $('opportunityHead').replaceChildren(head); $('opportunityBody').replaceChildren();
    currentPortfolio.forEach((record, index) => {
      const tr = element('tr');
      const score = element('span', String(record.score), 'scanner-score'); const rank = element('td'); rank.append(score);
      tr.append(rank, element('td', `${index + 1}. ${record.client}`), element('td', record.mci || '—'), element('td', record.portfolio || '—'), element('td', record.revenue == null ? '—' : currency.format(record.revenue)));
      const details = element('td');
      for (const opportunity of record.opportunities) { details.append(element('strong', opportunity.label), element('p', opportunity.evidence, 'scanner-evidence')); }
      tr.append(details); $('opportunityBody').append(tr);
    });
    if (!currentPortfolio.length) {
      const tr = element('tr'), td = element('td', 'Nenhuma oportunidade satisfez simultaneamente os limites e os campos mapeados.'); td.colSpan = 6; tr.append(td); $('opportunityBody').append(tr);
    }
    $('downloadPortfolio').disabled = !currentPortfolio.length; $('opportunityResults').hidden = false; $('opportunityResults').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('openBi').addEventListener('click', () => {
    if (!currentPortfolio.length) { $('message').textContent = 'Identifique oportunidades antes de abrir a apresentação BI.'; return; }
    window.location.href = 'scanner-bi.html';
  });
  const quoteCsv = value => { let text = String(value ?? ''); if (/^[\s]*[=+@-]/.test(text)) text = "'" + text; return `"${text.replace(/"/g, '""')}"`; };
  $('downloadPortfolio').addEventListener('click', () => {
    if (!currentPortfolio.length) return;
    const header = ['Prioridade', 'Pontuação', 'Cliente', 'MCI', 'Carteira', 'Faturamento', 'Oportunidades', 'Evidências'];
    const lines = [header, ...currentPortfolio.map((record, index) => [index + 1, record.score, record.client, record.mci, record.portfolio, record.revenue ?? '', record.opportunities.map(item => item.label).join(' | '), record.opportunities.map(item => item.evidence).join(' | ')])]
      .map(row => row.map(quoteCsv).join(','));
    const url = URL.createObjectURL(new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = element('a'); link.href = url; link.download = 'central-carteira-oportunidades.csv'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('download').addEventListener('click', () => {
    const active = columns.filter(column => column.enabled);
    if (!selected.size || !active.length) { $('message').textContent = 'Selecione pelo menos uma coluna e um registro.'; return; }
    if (active.some(column => !column.name) || new Set(active.map(column => column.name)).size !== active.length) { $('message').textContent = 'Use nomes de coluna preenchidos e diferentes entre si.'; return; }
    // Prevent formula execution when this CSV is opened in spreadsheet software.
    const lines = [active.map(column => quoteCsv(column.name)).join(','), ...chosen().map(row => active.map(column => quoteCsv(row[column.key])).join(','))];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = element('a'); link.href = url; link.download = 'central-selecao.csv'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
})();
