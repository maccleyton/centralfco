const test = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../credit-catalog.js');
const rules = require('../credit-rules.js');
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
test('triagem inteligente aplica limites documentados por produto', () => {
  const base={principal:50000,annualRevenue:1000000,installments:24,graceMonths:0,purpose:'working_capital',ruralActivity:false,fgiAvailable:'yes',guaranteeCoverage:100};
  assert.equal(eligibility.evaluate(catalog.getById('bndes-digital'),base).status,'preliminarily_eligible');
  assert.equal(eligibility.evaluate(catalog.getById('bndes-digital'),{...base,principal:50001}).status,'ineligible');
  assert.equal(eligibility.evaluate(catalog.getById('bndes-digital'),{...base,ruralActivity:true}).status,'ineligible');
  const pronampe={principal:480000,annualRevenue:800000,installments:48,graceMonths:6,purpose:'investment',womenLeadership:true,dicreEnabled:'yes'};
  assert.equal(eligibility.evaluate(catalog.getById('pronampe-atual'),pronampe).status,'preliminarily_eligible');
  assert.equal(eligibility.evaluate(catalog.getById('pronampe-atual'),{...pronampe,womenLeadership:false}).status,'ineligible');
});
test('PEAC valida requisitos cadastrais e cobertura informados localmente', () => {
  const base={principal:100000,annualRevenue:1000000,installments:24,graceMonths:6,purpose:'working_capital',fgiAvailable:'yes',dicreEnabled:'yes',fbaHistoryComplete:'yes',socialSecurityRegular:'yes',noOverdue14:'yes',activityAllowed:'yes',guaranteeCoverage:100};
  assert.equal(eligibility.evaluate(catalog.getById('peac-fgi'),base).status,'preliminarily_eligible');
  assert.equal(eligibility.evaluate(catalog.getById('peac-fgi'),{...base,guaranteeCoverage:99}).status,'ineligible');
  assert.equal(eligibility.evaluate(catalog.getById('peac-fgi'),{...base,noOverdue14:'no'}).status,'ineligible');
});
test('regras sugerem taxas somente quando documentadas', () => {
  const fies=rules.suggestedRate(rules.getProfile('fies-empreendedor'));
  assert.equal(fies.annual,11.18);
  assert.ok(fies.monthly>0&&fies.monthly<1);
  const pronampe=rules.suggestedRate(rules.getProfile('pronampe-atual'),10);
  assert.equal(pronampe.annual,16);
  assert.equal(rules.suggestedRate(rules.getProfile('pronampe-atual'),null),null);
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
test('simulador comparativo calcula SAC sem juros e quita o saldo', () => {
  const result=engine.simulateSchedule({principal:1200,monthlyRate:0,installments:12,system:'sac'});
  assert.equal(result.schedule.length,12);
  assert.equal(result.firstPayment,100);
  assert.equal(result.lastPayment,100);
  assert.equal(result.totalInterest,0);
  assert.equal(result.totalPaid,1200);
  assert.equal(result.effectiveMonthlyCost,0);
  assert.equal(result.schedule.at(-1).closingBalance,0);
});
test('simulador comparativo calcula Price, carência e custo efetivo', () => {
  const price=engine.simulateSchedule({principal:10000,monthlyRate:1,installments:12,system:'price',fee:100});
  assert.ok(Math.abs(price.firstPayment-price.lastPayment)<1);
  assert.ok(price.totalPaid>price.principal);
  assert.ok(price.effectiveMonthlyCost>price.monthlyRate);
  assert.equal(price.schedule.at(-1).closingBalance,0);
  const grace=engine.simulateSchedule({principal:1000,monthlyRate:1,installments:2,graceMonths:1,system:'sac'});
  assert.equal(grace.schedule.length,3);
  assert.equal(grace.schedule[0].phase,'grace');
  assert.equal(grace.schedule[0].payment,0);
  assert.equal(grace.schedule[0].closingBalance,1010);
  assert.equal(grace.graceInterest,10);
  assert.equal(grace.graceDisbursement,0);
  assert.equal(grace.totalMonths,3);
  assert.equal(grace.schedule.at(-1).closingBalance,0);
});
test('CET incorpora IOF, tarifas e outros encargos no fluxo financeiro', () => {
  const result=engine.simulateSchedule({principal:10000,monthlyRate:1,installments:12,system:'price',fee:100,iof:200,otherCharges:50});
  assert.equal(result.totalCharges,350);
  assert.equal(result.netDisbursement,9650);
  assert.ok(result.effectiveMonthlyCost>result.monthlyRate);
  assert.ok(result.effectiveAnnualCost>result.effectiveMonthlyCost);
  assert.equal(result.totalPaid,result.installmentTotal+result.totalCharges);
});
test('simulador comparativo rejeita entradas fora dos limites', () => {
  assert.throws(()=>engine.simulateSchedule({principal:0,monthlyRate:1,installments:12}),RangeError);
  assert.throws(()=>engine.simulateSchedule({principal:1000,monthlyRate:-1,installments:12}),RangeError);
  assert.throws(()=>engine.simulateSchedule({principal:1000,monthlyRate:1,installments:0}),RangeError);
  assert.throws(()=>engine.simulateSchedule({principal:1000,monthlyRate:1,installments:12,fee:500,iof:300,otherCharges:200}),RangeError);
});
test('núcleo documental acrescenta versão e emissão', () => {
  const html = documents.enrich('<html><head><title>Teste</title></head><body></body></html>');
  assert.match(html,/central-document-template/);
  assert.match(html,/central-document-issued-at/);
  assert.match(html,new RegExp(documents.TEMPLATE_VERSION.replace(/\./g,'\\.')));
});
test('interfaces publicam o simulador PJ e os comandos avançados de lista', () => {
  const fs=require('node:fs');
  const path=require('node:path');
  const creditHtml=fs.readFileSync(path.join(__dirname,'..','credit-lines.html'),'utf8');
  const creditJs=fs.readFileSync(path.join(__dirname,'..','credit-lines.js'),'utf8');
  const writingJs=fs.readFileSync(path.join(__dirname,'..','redacao.js'),'utf8');
  assert.match(creditHtml,/id="pjSimulatorForm"/);
  assert.match(creditHtml,/credit-rules\.js\?v=2/);
  assert.match(creditHtml,/id="identifyLines"/);
  assert.match(creditHtml,/id="loadSelic"/);
  assert.match(creditHtml,/id="simulationFbaHistory"/);
  assert.match(creditHtml,/id="simulationGuaranteeCoverage"/);
  assert.match(creditHtml,/id="simulationCashbackEligible"/);
  assert.match(creditHtml,/id="saveSimulation"/);
  assert.match(creditHtml,/id="savedSimulation"/);
  assert.match(creditHtml,/calcular o CET/i);
  assert.match(creditHtml,/valores meramente estimativos/i);
  assert.match(creditJs,/simulateSchedule/);
  assert.match(creditJs,/IOF total/);
  assert.match(creditJs,/CET a\.a\./);
  assert.match(creditJs,/Melhor opção geral/);
  assert.match(creditJs,/scenario-card__validation/);
  assert.match(creditJs,/centralCreditSimulationsV1/);
  assert.match(creditJs,/saveCurrentSimulation/);
  assert.match(creditJs,/loadSavedSimulation/);
  assert.match(creditJs,/comparisonReportHtml/);
  assert.match(creditJs,/id="printSimulationReport"/);
  assert.match(creditJs,/Imprimir relatório \/ salvar PDF/);
  assert.match(creditJs,/CentralDocuments\?\.openViewer/);
  assert.match(creditJs,/CRONOGRAMA/);
  assert.match(writingJs,/numberingFlow/);
  assert.match(writingJs,/\['Enter','Tab'\]/);
});
