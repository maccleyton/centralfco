(function (root) {
  'use strict';
  const text = value => String(value ?? '').trim();
  const uniqueText = values => [...new Set((Array.isArray(values) ? values : []).map(text).filter(Boolean))];
  const FIELD_DEFINITIONS = Object.freeze([
    { key: 'proposal', label: 'Número da proposta', type: 'text', defaultEnabled: true, defaultRequired: true },
    { key: 'legalName', label: 'Cliente ou razão social', type: 'text', defaultEnabled: true, defaultRequired: true },
    { key: 'mci', label: 'MCI', type: 'text', defaultEnabled: true, defaultRequired: false },
    { key: 'originalType', label: 'Produto ou tipo da operação', type: 'text', defaultEnabled: true, defaultRequired: true },
    { key: 'amount', label: 'Valor da operação', type: 'number', defaultEnabled: true, defaultRequired: true },
    { key: 'originalStage', label: 'Fase', type: 'stage', defaultEnabled: true, defaultRequired: true },
    { key: 'responsibleLabel', label: 'Responsável', type: 'responsible', defaultEnabled: true, defaultRequired: false },
    { key: 'enteredAt', label: 'Data de entrada', type: 'date', defaultEnabled: true, defaultRequired: false },
    { key: 'deadline', label: 'Prazo', type: 'date', defaultEnabled: true, defaultRequired: false },
    { key: 'portfolio', label: 'Carteira', type: 'text', defaultEnabled: false, defaultRequired: false },
    { key: 'notes', label: 'Observações', type: 'textarea', defaultEnabled: false, defaultRequired: false }
  ]);
  function number(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const raw = text(value);
    if (!raw) return 0;
    const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  function normalizeOperation(source, index = 0) {
    const proposal = text(source?.proposal);
    return {
      id: text(source?.id) || `${proposal || 'sem-proposta'}-${index}`,
      proposal, mci: text(source?.mci), legalName: text(source?.legalName),
      portfolio: text(source?.portfolio), amount: number(source?.amount), enteredAt: text(source?.enteredAt), deadline: text(source?.deadline),
      originalType: text(source?.originalType), originalStage: text(source?.originalStage) || 'Sem fase informada',
      responsibleLabel: text(source?.responsibleLabel) || 'Não informado', notes: text(source?.notes), origin: text(source?.origin) || 'Importada',
      categoryId: text(source?.categoryId), typeId: text(source?.typeId), phaseId: text(source?.phaseId), responsibleId: text(source?.responsibleId),
      customData: source?.customData && typeof source.customData === 'object' ? { ...source.customData } : {}
    };
  }
  function normalizePayload(payload) {
    if (!payload || payload.version !== 1 || !Array.isArray(payload.operations)) return null;
    return { version: 1, createdAt: text(payload.createdAt), sourceName: text(payload.sourceName) || 'Scanner', operations: payload.operations.map(normalizeOperation) };
  }
  function filterOperations(operations, filters = {}) {
    const query = text(filters.query).toLocaleLowerCase('pt-BR');
    return operations.filter(operation => {
      if (filters.stage && operation.originalStage !== filters.stage) return false;
      if (filters.responsible && operation.responsibleLabel !== filters.responsible) return false;
      if (!query) return true;
      return [operation.proposal, operation.mci, operation.legalName, operation.portfolio, operation.originalType, operation.originalStage, operation.responsibleLabel]
        .some(value => value.toLocaleLowerCase('pt-BR').includes(query));
    });
  }
  function summarize(operations) {
    return {
      count: operations.length,
      amount: operations.reduce((sum, operation) => sum + operation.amount, 0),
      stages: new Set(operations.map(operation => operation.originalStage)).size,
      responsibles: new Set(operations.map(operation => operation.responsibleLabel)).size
    };
  }
  function groupByStage(operations) {
    const groups = new Map();
    for (const operation of operations) {
      if (!groups.has(operation.originalStage)) groups.set(operation.originalStage, []);
      groups.get(operation.originalStage).push(operation);
    }
    return groups;
  }
  function defaultConfig(stages = [], responsibles = []) {
    return {
      version: 1,
      fields: Object.fromEntries(FIELD_DEFINITIONS.map(field => [field.key, { enabled: field.defaultEnabled, required: field.defaultRequired }])),
      stages: uniqueText(stages).length ? uniqueText(stages) : ['Sem fase informada'],
      responsibles: uniqueText(responsibles)
    };
  }
  function normalizeConfig(config, stages = [], responsibles = []) {
    const defaults = defaultConfig(stages, responsibles);
    if (!config || config.version !== 1) return defaults;
    const fields = {};
    for (const definition of FIELD_DEFINITIONS) {
      const received = config.fields?.[definition.key];
      const enabled = received?.required ? true : received?.enabled ?? defaults.fields[definition.key].enabled;
      fields[definition.key] = { enabled: Boolean(enabled), required: Boolean(enabled && (received?.required ?? defaults.fields[definition.key].required)) };
    }
    return {
      version: 1,
      fields,
      stages: uniqueText(config.stages).length ? uniqueText(config.stages) : defaults.stages,
      responsibles: uniqueText(config.responsibles)
    };
  }
  function mergeOperations(current = [], incoming = []) {
    const result = new Map();
    [...current, ...incoming].map(normalizeOperation).forEach(operation => {
      const key = operation.proposal ? `proposal:${operation.proposal.toLocaleLowerCase('pt-BR')}` : `id:${operation.id}`;
      result.set(key, operation);
    });
    return [...result.values()];
  }
  const api = Object.freeze({ FIELD_DEFINITIONS, normalizeOperation, normalizePayload, filterOperations, summarize, groupByStage, defaultConfig, normalizeConfig, mergeOperations });
  root.CentralPipeline = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
