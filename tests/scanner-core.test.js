const test = require('node:test');
const assert = require('node:assert/strict');
const scanner = require('../scanner-core');

test('Lists schema, escaped quotes and multiline notes survive import', () => {
  const result = scanner.parseCsv('\uFEFFListSchema={"schemaXmlList":[]}\r\n"MCI","Observações"\r\n"00123","Ligou, disse ""sim""\nRetornar"\r\n');
  assert.deepEqual(result.schema, { schemaXmlList: [] });
  assert.deepEqual(result.rows, [{ MCI: '00123', Observações: 'Ligou, disse "sim"\nRetornar' }]);
});
test('semicolon CSV and empty trailing fields are supported', () => {
  assert.deepEqual(scanner.parseCsv('MCI;Nome;Prazo\n123;Empresa;').rows, [{ MCI: '123', Nome: 'Empresa', Prazo: '' }]);
});
test('malformed CSV does not silently discard data', () => {
  for (const text of ['A,A\n1,2', 'A,B\n1', 'A,B\n"1,2', 'A,B\n"1"oops,2', 'ListSchema={}']) assert.throws(() => scanner.parseCsv(text));
});
test('US-formatted Lists currency and Brazilian currency normalize correctly', () => {
  assert.equal(scanner.money('R$ 150,000.00'), 150000);
  assert.equal(scanner.money('R$ 150.000,00'), 150000);
  assert.equal(scanner.money('1250,50'), 1250.5);
  for (const value of ['', '150,000', '-20', 'NaN', 'R$ 1x']) assert.throws(() => scanner.money(value));
});
test('calendar dates are checked, and absent optional deadlines remain null', () => {
  assert.equal(scanner.date('2026-07-29T03:00:00Z', true), '2026-07-29');
  assert.equal(scanner.date('29/07/2026'), '2026-07-29');
  assert.equal(scanner.date(''), null);
  assert.throws(() => scanner.date('2026-02-30'));
});
const row = { 'Nº Proposta': '0001', MCI: '000123', 'Razão Social': 'Empresa', 'Data de Entrada': '2026-07-29T03:00:00Z', 'Tipo Operação': 'Giro FCO', Valor: 'R$ 150,000.00', Fase: 'Em Análise', Prazo: '' };
test('proposal duplicates are blocked, but multiple operations for a client are allowed', () => {
  const records = scanner.validate([row, { ...row, 'Nº Proposta': '0002' }, row]);
  assert.equal(records[0].errors.length, 0);
  assert.equal(records[1].errors.length, 0);
  assert.match(records[2].errors.join(' '), /duplicado/);
  assert.equal(records[0].operation.mci, '000123');
  assert.equal(records[0].operation.stageEnteredAt, null);
  assert.equal(records[0].operation.deadline, null);
});
test('unknown and amendment labels require mapping instead of inferred workflows', () => {
  const [record] = scanner.validate([{ ...row, 'Tipo Operação': 'Alt. Condições Pactuadas' }]);
  assert.deepEqual(record.operation.classification, { line: null, modality: null, process: null });
  assert.ok(record.warnings.some(message => /confirmação/.test(message)));
  assert.equal(record.operation.originalStage, 'Em Análise');
});

test('medidas e indicadores aceitam formatos dos relatórios sem inventar valores ausentes', () => {
  assert.equal(scanner.measure('R$ 1.250.000,50'), 1250000.5);
  assert.equal(scanner.measure('15,5%'), 0.155);
  assert.equal(scanner.measure(-20), -20);
  assert.equal(scanner.measure(''), null);
  assert.equal(scanner.measure('não informado'), null);
  assert.equal(scanner.flag('Sim'), true);
  assert.equal(scanner.flag('NÃO'), false);
  assert.equal(scanner.flag(''), null);
  assert.equal(scanner.flag('talvez'), null);
});

test('scanner de oportunidades exige mapeamento e explica cada regra acionada', () => {
  const rows = [
    { MCI: '001', Cliente: 'Alfa', Receita: 'R$ 2.000.000,00', Limite: '0', Pix: '1000', Credito: 'Sim', Seguro: 'Não', Consorcio: 'Não' },
    { MCI: '002', Cliente: 'Beta', Receita: '500000', Limite: '0', Pix: '0', Credito: 'Não', Seguro: 'Não', Consorcio: 'Não' }
  ];
  const mappings = { mci: 'MCI', client: 'Cliente', revenue: 'Receita', creditLimit: 'Limite', pixVolume: 'Pix', hasCredit: 'Credito', hasInsurance: 'Seguro', hasConsortium: 'Consorcio' };
  const result = scanner.analyzeOpportunities(rows, mappings, { minRevenue: '1000000', maxCreditLimit: '0', maxPix: '5000', minConsortiumRevenue: '1000000', weights: { credit: 40, pix: 25, insurance: 20, consortium: 15 } });
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].client, 'Alfa');
  assert.equal(result.records[0].score, 100);
  assert.deepEqual(result.records[0].opportunities.map(item => item.key), ['credit', 'pix', 'insurance', 'consortium']);
  assert.match(result.records[0].opportunities[0].evidence, /faturamento/);
  assert.ok(result.rules.every(rule => rule.enabled));
});

test('regra sem coluna confirmada fica desativada e não interpreta siglas', () => {
  const result = scanner.analyzeOpportunities([{ MCI: '001', RA: '10' }], { mci: 'MCI' }, { minRevenue: 0 });
  assert.equal(result.records.length, 0);
  assert.ok(result.rules.every(rule => !rule.enabled));
  assert.ok(result.rules.find(rule => rule.key === 'pix').missing.includes('pixVolume'));
});
