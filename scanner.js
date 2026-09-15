(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  let data = null, selected = new Set(), columns = [];
  const element = (tag, text, className) => {
    const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node;
  };
  const visible = () => data.rows.map((row, index) => ({ row, index })).filter(({ row }) =>
    Object.values(row).some(value => value.toLocaleLowerCase('pt-BR').includes($('search').value.toLocaleLowerCase('pt-BR'))));
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
    for (const { row, index } of matches) {
      const tr = element('tr'), td = element('td'), check = element('input');
      check.type = 'checkbox'; check.checked = selected.has(index); check.setAttribute('aria-label', `Selecionar registro ${index + 1}`);
      check.addEventListener('change', () => { if (check.checked) selected.add(index); else selected.delete(index); invalidate(); updateCount(matches.length); });
      td.append(check); tr.append(td);
      for (const column of active) tr.append(element('td', row[column.key]));
      $('tableBody').append(tr);
    }
    updateCount(matches.length);
  }
  function updateCount(matches) { $('count').textContent = `${data.rows.length} registros · ${matches} na pesquisa · ${selected.size} selecionados`; }
  $('file').addEventListener('change', async () => {
    data = null; selected.clear(); $('selection').hidden = true; invalidate();
    const file = $('file').files[0]; if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Nesta primeira versão, selecione um CSV de até 5 MB.');
      data = CentralScanner.parseCsv(await file.text());
      if (data.rows.length > 5000) throw new Error('Nesta primeira versão, selecione até 5.000 registros.');
      const missing = CentralScanner.REQUIRED.filter(key => !data.headers.includes(key));
      selected = new Set(data.rows.map((_, index) => index));
      columns = data.headers.map(key => ({ key, name: key, enabled: true }));
      $('columns').replaceChildren(); $('search').value = '';
      for (const column of columns) {
        const label = element('label'), check = element('input'), rename = element('input');
        check.type = 'checkbox'; check.checked = true; check.disabled = CentralScanner.REQUIRED.includes(column.key);
        check.setAttribute('aria-label', `Incluir ${column.key}`);
        rename.value = column.name; rename.setAttribute('aria-label', `Nome de exportação para ${column.key}`);
        check.addEventListener('change', () => { column.enabled = check.checked; render(); });
        rename.addEventListener('input', () => { column.name = rename.value.trim(); render(); });
        label.append(check, element('span', column.key), rename); $('columns').append(label);
      }
      $('preview').disabled = !!missing.length;
      $('message').textContent = missing.length ? `CSV disponível para seleção. Para o Pipeline faltam: ${missing.join(', ')}.` : `${data.rows.length} operações lidas. Confira a seleção e valide.`;
      $('selection').hidden = false; render();
    } catch (error) { data = null; $('message').textContent = error.message; }
  });
  $('search').addEventListener('input', () => { if (data) render(); });
  $('selectVisible').addEventListener('click', () => { visible().forEach(({ index }) => selected.add(index)); render(); });
  $('clearVisible').addEventListener('click', () => { visible().forEach(({ index }) => selected.delete(index)); render(); });
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
