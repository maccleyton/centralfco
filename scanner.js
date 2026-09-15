(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  let data = null, selected = new Set(), columns = [], workbook = null, filters = [], page = 0, fileVersion = 0;
  const PAGE_SIZE = 50;
  const MODEL_KEY = "centralScannerModelsV1";
  const element = (tag, text, className) => {
    const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node;
  };
  const visible = () => data.rows.map((row, index) => ({ row, index })).filter(({ row }) =>
    Object.values(row).some(value => value.toLocaleLowerCase('pt-BR').includes($('search').value.toLocaleLowerCase('pt-BR')))
    && filters.every(filter => CentralScanner.matches(row, data.typedRows?.[index], filter)));
  const chosen = () => data.rows.filter((_, index) => selected.has(index));
  const invalidate = () => { $('results').hidden = true; };
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
    $('selection').hidden = false; drawColumns(); render();
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
      Object.defineProperty(models, name, { value: { columns, filters, headerStart: Number($('headerStart').value), headerDepth: Number($('headerDepth').value) }, enumerable: true, configurable: true });
      localStorage.setItem(MODEL_KEY, JSON.stringify(models)); listModels(); $('message').textContent = 'Modelo salvo com colunas e filtros. Os registros não são salvos.';
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
    filters = model.filters.map(filter => ({ ...filter })); page = 0; drawColumns(); showFilters(); render(); $('message').textContent = 'Modelo aplicado. Confira as colunas e os resultados.';
  });
  listModels();
  $('search').addEventListener('input', () => { if (data) { page = 0; render(); } });
  $('selectVisible').addEventListener('click', () => { visible().forEach(({ index }) => selected.add(index)); render(); });
  $('clearVisible').addEventListener('click', () => { visible().forEach(({ index }) => selected.delete(index)); render(); });
  $('clearAllRows').addEventListener('click', () => { selected.clear(); render(); });
  $('preview').addEventListener('click', () => {
    const checked = CentralScanner.validate(chosen());
    $('validation').replaceChildren(); $('board').replaceChildren(); $('results').hidden = false;
    const invalid = checked.filter(record => record.errors.length);
    $('validation').append(element('p', `${checked.length} selecionadas · ${invalid.length} com erro · ${checked.filter(record => record.warnings.length).length} com avisos`));
    for (const record of checked) {
      const messages = [...record.errors, ...record.warnings];
      if (messages.length) $('validation').append(element('p', `Proposta ${record.operation.proposal}: ${messages.join(' ')}`, record.errors.length ? 'scanner-error' : 'scanner-warning'));
    }
    if (invalid.length || !checked.length) { $('validation').append(element('p', 'Selecione registros válidos para visualizar o Pipeline.')); return; }
    const groups = new Map();
    for (const { operation } of checked) {
      if (!groups.has(operation.originalStage)) groups.set(operation.originalStage, []);
      groups.get(operation.originalStage).push(operation);
    }
    const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    for (const [stage, operations] of groups) {
      const lane = element('section', null, 'scanner-lane'); lane.append(element('h3', `${stage} (${operations.length})`));
      for (const operation of operations) {
        const card = element('article', null, 'scanner-card'); card.append(element('strong', operation.legalName));
        for (const line of [`Proposta ${operation.proposal} · MCI ${operation.mci}`, operation.originalType, currency.format(operation.amount), `Responsável: ${operation.responsibleLabel}`, `Entrada: ${operation.enteredAt}`, `Prazo: ${operation.deadline || 'não informado'}`, operation.notes]) if (line) card.append(element('p', line));
        lane.append(card);
      }
      $('board').append(lane);
    }
  });
  $('download').addEventListener('click', () => {
    const active = columns.filter(column => column.enabled);
    if (!selected.size || !active.length) { $('message').textContent = 'Selecione pelo menos uma coluna e um registro.'; return; }
    if (active.some(column => !column.name) || new Set(active.map(column => column.name)).size !== active.length) { $('message').textContent = 'Use nomes de coluna preenchidos e diferentes entre si.'; return; }
    // Prevent formula execution when this CSV is opened in spreadsheet software.
    const quote = value => { let text = String(value ?? ''); if (/^[\s]*[=+@-]/.test(text)) text = "'" + text; return `"${text.replace(/"/g, '""')}"`; };
    const lines = [active.map(column => quote(column.name)).join(','), ...chosen().map(row => active.map(column => quote(row[column.key])).join(','))];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = element('a'); link.href = url; link.download = 'central-selecao.csv'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
})();
