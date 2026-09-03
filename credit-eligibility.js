(function (root) {
  'use strict';
  function finite(value) { const number = Number(value); return Number.isFinite(number) ? number : null; }
  function evaluate(line, input = {}) {
    if (!line) return { status:'needs_review', reasons:['Linha não localizada no catálogo.'] };
    const failures = [];
    const pending = [];
    for (const rule of line.rules || []) {
      const value = finite(input[rule.field]);
      if (value === null) { pending.push(`Informe: ${rule.label}.`); continue; }
      if (rule.operator === 'lte' && value > rule.value) failures.push(`Não atende: ${rule.label}.`);
      else if (rule.operator === 'gte' && value < rule.value) failures.push(`Não atende: ${rule.label}.`);
    }
    if (failures.length) return { status:'ineligible', reasons:failures };
    if (pending.length || line.status === 'process' || line.status === 'external_parameters' || line.status === 'historical') {
      return { status:'needs_review', reasons:[...pending, 'A decisão final depende das regras e parâmetros vigentes.'] };
    }
    return { status:'preliminarily_eligible', reasons:['Os critérios locais informados foram atendidos; confirme as condições vigentes.'] };
  }
  const api = { evaluate };
  root.CentralCreditEligibility = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
