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
  function filterNumber(input) {
    let text = String(input ?? '').trim();
    const percentage = text.endsWith('%'); if (percentage) text = text.slice(0, -1).trim();
    const negative = text.startsWith('-'); text = text.replace(/^[+-]/, '');
    return money(text) * (negative ? -1 : 1) / (percentage ? 100 : 1);
  }
  function matches(row, typedRow, filter) {
    const display = String(row[filter.column] ?? '').trim();
    const target = String(filter.value ?? '').trim();
    const fold = value => value.toLocaleLowerCase('pt-BR');
    if (filter.operator === 'empty') return !display;
    if (filter.operator === 'contains') return fold(display).includes(fold(target));
    if (filter.operator === 'eq') return fold(display) === fold(target);
    if (filter.operator === 'ne') return fold(display) !== fold(target);
    if (!display) return false;
    if (['before', 'after'].includes(filter.operator)) {
      // ISO dates in exports can include SQL-style timestamps; compare calendar days.
      const value = /^\d{4}-\d{2}-\d{2}/.test(display) ? display.slice(0, 10) : display;
      try { const day = date(value, true), reference = date(target, true); return filter.operator === 'before' ? day < reference : day > reference; } catch (_) { return false; }
    }
    try {
      const number = typeof typedRow?.[filter.column] === 'number' ? typedRow[filter.column] : filterNumber(display);
      const reference = filterNumber(target);
      if (filter.operator === 'gt') return number > reference;
      if (filter.operator === 'lt') return number < reference;
      if (filter.operator === 'between') return number >= reference && number <= filterNumber(filter.upper);
    } catch (_) {}
    return false;
  }

  function measure(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    let text = String(value ?? '').trim();
    if (!text) return null;
    const percentage = text.endsWith('%');
    if (percentage) text = text.slice(0, -1).trim();
    text = text.replace(/^R\$\s*/, '').replace(/\s/g, '');
    const negative = /^-/.test(text); text = text.replace(/^[+-]/, '');
    if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)) text = text.replace(/,/g, '');
    else if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(text)) text = text.replace(/\./g, '').replace(',', '.');
    else if (/^\d+,\d+$/.test(text)) text = text.replace(',', '.');
    if (!/^\d+(\.\d+)?$/.test(text)) return null;
    const result = Number(text) * (negative ? -1 : 1) / (percentage ? 100 : 1);
    return Number.isFinite(result) ? result : null;
  }

  function flag(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1 ? true : value === 0 ? false : null;
    const text = String(value ?? '').trim().toLocaleLowerCase('pt-BR');
    if (['sim', 's', 'yes', 'true', '1', 'x'].includes(text)) return true;
    if (['não', 'nao', 'n', 'no', 'false', '0'].includes(text)) return false;
    return null;
  }

  function analyzeOpportunities(rows, mappings, settings = {}) {
    const map = mappings || {};
    const config = {
      minRevenue: measure(settings.minRevenue) ?? 0,
      maxCreditLimit: measure(settings.maxCreditLimit) ?? 0,
      maxPix: measure(settings.maxPix) ?? 0,
      minConsortiumRevenue: measure(settings.minConsortiumRevenue) ?? (measure(settings.minRevenue) ?? 0),
      weights: {
        credit: measure(settings.weights?.credit) ?? 40,
        pix: measure(settings.weights?.pix) ?? 25,
        insurance: measure(settings.weights?.insurance) ?? 20,
        consortium: measure(settings.weights?.consortium) ?? 15
      }
    };
    const definitions = [
      { key: 'credit', label: 'Potencial de crédito', needs: ['revenue', 'creditLimit'] },
      { key: 'pix', label: 'Captura de fluxo PIX', needs: ['revenue', 'pixVolume'] },
      { key: 'insurance', label: 'Oportunidade de seguros', needs: ['hasCredit', 'hasInsurance'] },
      { key: 'consortium', label: 'Oportunidade de consórcio', needs: ['revenue', 'hasConsortium'] }
    ];
    const rules = definitions.map(rule => {
      const missing = rule.needs.filter(field => !map[field]);
      return { ...rule, enabled: !missing.length, missing };
    });
    const value = (row, field) => map[field] ? row[map[field]] : null;
    const results = rows.map((row, index) => {
      const revenue = measure(value(row, 'revenue'));
      const creditLimit = measure(value(row, 'creditLimit'));
      const pixVolume = measure(value(row, 'pixVolume'));
      const hasCredit = flag(value(row, 'hasCredit'));
      const hasInsurance = flag(value(row, 'hasInsurance'));
      const hasConsortium = flag(value(row, 'hasConsortium'));
      const opportunities = [];
      if (rules[0].enabled && revenue != null && creditLimit != null && revenue > config.minRevenue && creditLimit <= config.maxCreditLimit) {
        opportunities.push({ key: 'credit', label: rules[0].label, weight: config.weights.credit, evidence: `faturamento ${revenue} > ${config.minRevenue}; limite ${creditLimit} ≤ ${config.maxCreditLimit}` });
      }
      if (rules[1].enabled && revenue != null && pixVolume != null && revenue > config.minRevenue && pixVolume <= config.maxPix) {
        opportunities.push({ key: 'pix', label: rules[1].label, weight: config.weights.pix, evidence: `faturamento ${revenue} > ${config.minRevenue}; PIX ${pixVolume} ≤ ${config.maxPix}` });
      }
      if (rules[2].enabled && hasCredit === true && hasInsurance === false) {
        opportunities.push({ key: 'insurance', label: rules[2].label, weight: config.weights.insurance, evidence: 'crédito informado como sim; seguro informado como não' });
      }
      if (rules[3].enabled && revenue != null && hasConsortium === false && revenue > config.minConsortiumRevenue) {
        opportunities.push({ key: 'consortium', label: rules[3].label, weight: config.weights.consortium, evidence: `faturamento ${revenue} > ${config.minConsortiumRevenue}; consórcio informado como não` });
      }
      return {
        sourceIndex: index,
        source: row,
        mci: String(value(row, 'mci') ?? '').trim(),
        client: String(value(row, 'client') ?? value(row, 'mci') ?? `Registro ${index + 1}`).trim(),
        portfolio: String(value(row, 'portfolio') ?? '').trim(),
        revenue,
        opportunities,
        score: opportunities.reduce((sum, item) => sum + item.weight, 0)
      };
    }).filter(record => record.opportunities.length)
      .sort((a, b) => b.score - a.score || (b.revenue ?? -Infinity) - (a.revenue ?? -Infinity) || a.sourceIndex - b.sourceIndex);
    return { config, rules, records: results };
  }
  const api = Object.freeze({ REQUIRED, parseCsv, money, date, classify, validate, matches, filterNumber, measure, flag, analyzeOpportunities });
  root.CentralScanner = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
