const test = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../credit-catalog.js');
const eligibility = require('../credit-eligibility.js');
const engine = require('../financial-engine.js');
const documents = require('../document-core.js');

test('catálogo mantém versões distintas e fontes', () => {
  assert.ok(catalog.lines.length >= 15);
  assert.ok(catalog.getById('pronampe-historico'));
  assert.ok(catalog.getById('pronampe-atual'));
  assert.ok(catalog.lines.every(line => line.catalogVersion === catalog.CATALOG_VERSION && line.sources.length));
  assert.equal(catalog.auditCatalog().valid,true);
  assert.ok(catalog.lines.every(line => line.sources.every(item => catalog.getSource(item.file))));
});
test('triagem reprova limite documentado e não promete aprovação final', () => {
  assert.equal(eligibility.evaluate(catalog.getById('bndes-digital'),{annualRevenue:5000000}).status,'ineligible');
  assert.equal(eligibility.evaluate(catalog.getById('pronampe-atual'),{}).status,'needs_review');
});
test('cálculos documentados arredondam e bloqueiam valores inválidos', () => {
  assert.equal(engine.paymentCapacity({revenue:10000,operatingCosts:6000,otherInstallments:500}),3500);
  assert.equal(engine.ownParticipation({totalInvestment:12345.67,financing:10000}),2345.67);
  assert.equal(engine.guaranteeCoverage({guaranteeValue:75000,operationValue:100000}),75);
  assert.throws(()=>engine.ownParticipation({totalInvestment:100,financing:101}),RangeError);
  assert.throws(()=>engine.guaranteeCoverage({guaranteeValue:1,operationValue:0}),RangeError);
});
test('produtos sem fórmula permanecem indisponíveis', () => {
  assert.equal(engine.simulateLine(catalog.getById('aqt')).status,'unavailable');
});
test('núcleo documental acrescenta versão e emissão', () => {
  const html = documents.enrich('<html><head><title>Teste</title></head><body></body></html>');
  assert.match(html,/central-document-template/);
  assert.match(html,/central-document-issued-at/);
  assert.match(html,new RegExp(documents.TEMPLATE_VERSION.replace(/\./g,'\\.')));
});
