const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');

test('páginas carregam dependências compartilhadas antes dos consumidores', () => {
  const pages = ['index.html','declaracoes.html','utilitarios.html'];
  for (const page of pages) {
    const html = read(page);
    assert.ok(html.indexOf('central-data.js') < html.indexOf('cnpj-api.js'),`${page}: ordem do cadastro`);
    assert.ok(html.indexOf('document-core.js') >= 0,`${page}: núcleo documental`);
  }
});

test('geradores usam visualizador e não gravam HTML no computador', () => {
  for (const file of ['app.js','relatorios.js','faturamento.js','correios.js']) {
    const source = read(file);
    assert.doesNotMatch(source,/document\.write\s*\(/,file);
    assert.doesNotMatch(source,/createObjectURL\s*\(\s*new Blob\s*\(\s*\[.*html/is,file);
  }
});

test('fontes e rodapés institucionais vêm do núcleo documental', () => {
  assert.match(read('reports.js'),/CentralDocuments\.supportFooter/);
  assert.match(read('relatorios.js'),/CentralDocuments\.supportFooter/);
  assert.match(read('faturamento.js'),/CentralDocuments\.supportFooter/);
  assert.match(read('reports.js'),/CentralDocuments\.fontCss/);
});

test('visualizador aplica expiração e remove o conteúdo', () => {
  const source = read('report-viewer.js');
  assert.match(source,/REPORT_VIEWER_EXPIRED/);
  assert.match(source,/reportFrame\.srcdoc\s*=\s*''/);
  assert.match(read('document-core.js'),/5 \* 60 \* 1000/);
});

test('consulta completa de CNPJ pertence somente aos utilitários', () => {
  assert.doesNotMatch(read('relatorios.html'),/companyLookupForm|consulta-cnpj/);
  assert.match(read('utilitarios.html'),/id="companyLookupPanel"/);
  assert.match(read('utilitarios.html'),/id="companyLookupForm"/);
});

test('declaração de regularidade reserva uma página e mantém o rodapé ancorado', () => {
  const source = read('reports.js');
  assert.match(source,/regularity-document/);
  assert.match(source,/\.regularity-document\{height:297mm/);
  assert.match(source,/\.document-footer\{position:absolute/);
});

test('hub oferece área própria de redação com editor modular', () => {
  const hub = read('index.html');
  const page = read('redacao.html');
  const source = read('redacao.js');
  assert.match(hub,/href="redacao\.html"/);
  assert.match(hub,/>6<\/strong><span>áreas de trabalho/);
  assert.match(page,/data-add-block="paragraph"/);
  assert.match(page,/data-add-block="table"/);
  assert.match(page,/Autorização de Faturamento/);
  assert.match(source,/rowTotals/);
  assert.match(source,/CentralDocuments\.openViewer/);
  assert.match(page,/id="sellerCnpj"/);
  assert.match(page,/id="sellerAddress"/);
  assert.match(source,/CnpjApi\.request\(document,\{remember:false\}\)/);
  assert.match(read('cnpj-api.js'),/options\.remember !== false/);
});
