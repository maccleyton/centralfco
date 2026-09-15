(function (root) {
  'use strict';
  const REQUIRED = ['Nº Proposta', 'MCI', 'Razão Social', 'Data de Entrada', 'Tipo Operação', 'Valor', 'Fase'];

  // Parse quoted fields, including embedded commas, escaped quotes and line breaks.
  function parseCsv(input) {
    let text = String(input).replace(/^\uFEFF/, '');
    let schema = null;
    if (text.startsWith('ListSchema=')) {
      const end = text.indexOf('\n');
      if (end < 0) throw new Error('O arquivo contém esquema, mas não contém registros CSV.');
      try { schema = JSON.parse(text.slice(11, end).trim()); }
      catch (_) { throw new Error('Esquema do Microsoft Lists inválido.'); }
      text = text.slice(end + 1);
    }
    const first = text.split(/\r?\n/)[0];
    const count = separator => {
      let quoted = false, total = 0;
      for (let i = 0; i < first.length; i++) {
        if (first[i] === '"') { if (quoted && first[i + 1] === '"') i++; else quoted = !quoted; }
        else if (!quoted && first[i] === separator) total++;
      }
      return total;
    };
    const delimiter = [',', ';', '\t'].sort((a, b) => count(b) - count(a))[0];
    const records = [];
    let row = [], field = '', quoted = false, closed = false;
    const pushField = () => { row.push(field); field = ''; closed = false; };
    const pushRow = () => { pushField(); if (row.some(value => value.trim())) records.push(row); row = []; };
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (quoted) {
        if (char === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else { quoted = false; closed = true; }
        } else field += char;
      } else if (char === '"') {
        if (field || closed) throw new Error('Aspas em posição inválida no CSV.');
        quoted = true;
      } else if (char === delimiter) pushField();
      else if (char === '\n' || char === '\r') {
        if (char === '\r' && text[i + 1] === '\n') i++;
        pushRow();
      } else {
        if (closed) throw new Error('Conteúdo após o fechamento de aspas no CSV.');
        field += char;
      }
    }
    if (quoted) throw new Error('Campo com aspas não fechadas no CSV.');
    if (field || row.length || closed) pushRow();
    const headers = (records.shift() || []).map(value => value.trim());
    if (!headers.length || headers.some(value => !value) || new Set(headers).size !== headers.length) {
      throw new Error('Cabeçalhos vazios ou duplicados no CSV.');
    }
    const rows = records.map((values, index) => {
      if (values.length !== headers.length) throw new Error(`Registro ${index + 1}: quantidade de colunas diferente do cabeçalho.`);
      return Object.fromEntries(headers.map((header, i) => [header, values[i]]));
    });
    return { schema, headers, rows, delimiter };
  }

  function money(value) {
    const original = String(value ?? '').trim();
    if (!original) throw new Error('Valor ausente.');
    let number = original.replace(/^R\$\s*/, '').replace(/\s/g, '');
    if (/^\d{1,3}(,\d{3})+\.\d{2}$/.test(number)) number = number.replace(/,/g, '');
    else if (/^\d{1,3}(\.\d{3})+,\d{2}$/.test(number)) number = number.replace(/\./g, '').replace(',', '.');
    else if (/^\d+,\d{1,2}$/.test(number)) number = number.replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(number)) throw new Error(`Valor inválido ou ambíguo: ${original}`);
    const amount = Number(number);
    if (!Number.isFinite(amount) || amount > Number.MAX_SAFE_INTEGER / 100) throw new Error('Valor fora do intervalo permitido.');
    return amount;
  }

  function date(value, required = false) {
    const raw = String(value ?? '').trim();
    if (!raw && !required) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.exec(raw)
      || /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
    if (!match) throw new Error(`Data inválida: ${raw || '(vazia)'}`);
    const parts = raw.includes('/') ? [match[3], match[2], match[1]] : match.slice(1, 4);
    const iso = parts.join('-');
    const parsed = new Date(`${iso}T00:00:00Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso) throw new Error(`Data inválida: ${raw}`);
    return iso;
  }

  function classify(value) {
    const type = String(value).trim();
    if (type === 'Giro FCO') return { line: 'FCO', modality: 'Giro', process: 'Contratação' };
    if (type === 'Giro Pronampe') return { line: 'Pronampe', modality: 'Giro', process: 'Contratação' };
    if (/^FCO Desenv\./.test(type)) return { line: 'FCO', modality: 'Investimento', process: 'Contratação' };
    // The export does not identify the product/contract underlying an amendment.
    return { line: null, modality: null, process: null };
  }

  function validate(rows) {
    const seen = new Set();
    return rows.map((source, index) => {
      const errors = [], warnings = [];
      for (const key of REQUIRED) if (!String(source[key] ?? '').trim()) errors.push(`${key}: obrigatório.`);
      const proposal = String(source['Nº Proposta'] ?? '').trim();
      if (proposal && seen.has(proposal)) errors.push('Número de proposta duplicado na seleção.');
      seen.add(proposal);
      let amount = null, enteredAt = null, deadline = null;
      for (const [key, parse] of [['Valor', money], ['Data de Entrada', value => date(value, true)], ['Prazo', date]]) {
        try {
          const result = parse(source[key]);
          if (key === 'Valor') amount = result;
          else if (key === 'Prazo') deadline = result;
          else enteredAt = result;
        } catch (error) { errors.push(error.message); }
      }
      const classification = classify(source['Tipo Operação']);
      if (!classification.process) warnings.push('Produto, modalidade e processo precisam de confirmação.');
      if (!deadline) warnings.push('Prazo não informado; nenhum prazo será criado automaticamente.');
      warnings.push('O CSV não contém histórico de transições nem data de entrada na fase atual.');
      return {
        sourceRow: index + 1, source: { ...source }, errors, warnings,
        operation: {
          proposal, mci: String(source.MCI ?? '').trim(), legalName: String(source['Razão Social'] ?? '').trim(),
          portfolio: String(source.Carteira ?? '').trim(), amount, enteredAt, deadline,
          originalType: String(source['Tipo Operação'] ?? '').trim(), originalStage: String(source.Fase ?? '').trim(),
          responsibleLabel: String(source['Responsável'] ?? '').trim(), notes: String(source['Observações'] ?? ''),
          classification, stageEnteredAt: null
        }
      };
    });
  }
  const api = Object.freeze({ REQUIRED, parseCsv, money, date, classify, validate });
  root.CentralScanner = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
