const test = require('node:test');
const assert = require('node:assert/strict');
const pipeline = require('../pipeline-core');

const operations = [
  { proposal: '001', mci: '100', legalName: 'Alfa', amount: 1000, originalStage: 'Em Análise', responsibleLabel: 'Ana', originalType: 'Giro FCO' },
  { proposal: '002', mci: '200', legalName: 'Beta', amount: 2500, originalStage: 'Em Liberação', responsibleLabel: 'Bruno', originalType: 'Investimento' },
  { proposal: '003', mci: '300', legalName: 'Gama', amount: 500, originalStage: 'Em Análise', responsibleLabel: 'Ana', originalType: 'Giro FCO' }
].map(pipeline.normalizeOperation);

test('payload do Pipeline preserva fases e rejeita formatos desconhecidos', () => {
  assert.equal(pipeline.normalizePayload(null), null);
  assert.equal(pipeline.normalizePayload({ version: 2, operations: [] }), null);
  const payload = pipeline.normalizePayload({ version: 1, sourceName: 'Lists', operations });
  assert.equal(payload.operations.length, 3);
  assert.equal(payload.operations[0].originalStage, 'Em Análise');
});

test('visões colunar e Kanban compartilham filtros e totais', () => {
  const filtered = pipeline.filterOperations(operations, { query: 'giro', stage: 'Em Análise', responsible: 'Ana' });
  assert.equal(filtered.length, 2);
  assert.deepEqual(pipeline.summarize(filtered), { count: 2, amount: 1500, stages: 1, responsibles: 1 });
  const groups = pipeline.groupByStage(operations);
  assert.equal(groups.get('Em Análise').length, 2);
  assert.equal(groups.get('Em Liberação').length, 1);
});

test('operação sem fase ou responsável mantém ausência explícita', () => {
  const item = pipeline.normalizeOperation({ proposal: '004', amount: 'inválido' });
  assert.equal(item.amount, 0);
  assert.equal(item.originalStage, 'Sem fase informada');
  assert.equal(item.responsibleLabel, 'Não informado');
});

test('configuração controla campos, obrigatoriedade, fases e responsáveis', () => {
  const defaults = pipeline.defaultConfig(['Em Análise'], ['Ana']);
  assert.equal(defaults.fields.proposal.required, true);
  assert.equal(defaults.fields.notes.enabled, false);
  assert.deepEqual(defaults.stages, ['Em Análise']);
  const customized = pipeline.normalizeConfig({
    version: 1,
    fields: { notes: { enabled: false, required: true }, amount: { enabled: false, required: false } },
    stages: ['Prospecção', 'Prospecção', 'Contratação'],
    responsibles: ['Ana', 'Ana', 'Bruno']
  });
  assert.deepEqual(customized.fields.notes, { enabled: true, required: true });
  assert.deepEqual(customized.fields.amount, { enabled: false, required: false });
  assert.deepEqual(customized.stages, ['Prospecção', 'Contratação']);
  assert.deepEqual(customized.responsibles, ['Ana', 'Bruno']);
});

test('operações locais e importadas são mescladas sem duplicar proposta', () => {
  const local = pipeline.normalizeOperation({ id: 'local-1', proposal: '001', legalName: 'Versão local', amount: '1.500,50' });
  const imported = pipeline.normalizeOperation({ proposal: '001', legalName: 'Versão importada', amount: 2000 });
  const manual = pipeline.normalizeOperation({ id: 'manual-2', proposal: '002', legalName: 'Cadastro manual', amount: '300' });
  const merged = pipeline.mergeOperations([local, manual], [imported]);
  assert.equal(merged.length, 2);
  assert.equal(merged.find(item => item.proposal === '001').legalName, 'Versão importada');
  assert.equal(merged.find(item => item.proposal === '002').id, 'manual-2');
  assert.equal(local.amount, 1500.5);
});
