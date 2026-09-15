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
