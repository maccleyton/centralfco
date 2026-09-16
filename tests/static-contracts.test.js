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

test('formulário baixa documentos separados e visualizador mantém a impressão consolidada responsiva', () => {
  const form = read('index.html');
  const core = read('document-core.js');
  const viewer = read('report-viewer.js');
  assert.match(form,/id="individualDownloadList"/);
  assert.match(form,/html2canvas\/1\.4\.1/);
  assert.match(form,/jspdf\/2\.5\.1/);
  assert.match(core,/querySelectorAll\('\.document\[data-documento\]'\)/);
  assert.match(core,/current\?\.title === title/);
  assert.match(core,/downloadDocumentFromHtml/);
  assert.match(core,/pdf\.save\(filename\)/);
  assert.match(viewer,/reportPage\?\.getBoundingClientRect\(\)\.width/);
  assert.match(viewer,/reportFrame\.style\.width = `\$\{naturalWidth\}px`/);
  assert.match(viewer,/reportFrameShell\.clientWidth \/ reportFrame\.offsetWidth/);
  assert.match(viewer,/reportFrame\.contentWindow\.print\(\)/);
});

test('declaração de condenação usa o título integral do template', () => {
  const expected = 'DECLARAÇÃO DE INEXISTÊNCIA DE CONDENAÇÃO POR TRABALHO INFANTIL, TRABALHO ESCRAVO, CRIME CONTRA O MEIO AMBIENTE, ASSÉDIO MORAL OU SEXUAL, VIOLÊNCIA CONTRA A MULHER, OU RACIAL E DE ETNIA';
  const reports = read('reports.js');
  assert.match(reports, new RegExp(expected));
  assert.match(read('index.html'), new RegExp(`data-document-title="${expected}"`));
  assert.match(reports, /titleLength > 130 \? ' document-header--dense'/);
  assert.match(reports, /\.document-header--dense strong\{font-size:10pt;line-height:1\}/);
  assert.match(reports, /\.document-header--compact strong\{font-size:10\.5pt/);
  assert.match(read('document-core.js'), /document-header--dense/);
});

test('FCO Giro aplica carência de seis meses e dezoito meses para FCO Mulher', () => {
  const source = read('app.js');
  assert.match(source, /maxTotal: 48, maxGrace: 18[^\n]+Capital de Giro · FCO Mulher/);
  assert.match(source, /maxTotal: 24, maxGrace: 6[^\n]+Capital de Giro/);
  assert.doesNotMatch(source, /maxTotal: 48, maxGrace: 6[^\n]+Capital de Giro · FCO Mulher/);
  assert.doesNotMatch(source, /maxTotal: 24, maxGrace: 3[^\n]+Capital de Giro/);
});

test('composição financeira calcula o financiamento e limita o giro a trinta por cento', () => {
  const form = read('index.html');
  const source = read('app.js');
  const budgetPosition = form.indexOf('id="valorOrcamento"');
  const ownResourcesPosition = form.indexOf('id="recursosProprios"');
  const financedPosition = form.indexOf('id="valorFinanciado"');

  assert.ok(budgetPosition < ownResourcesPosition && ownResourcesPosition < financedPosition);
  assert.match(form,/id="recursosProprios" name="recursosProprios"[^>]*required/);
  assert.match(form,/id="valorFinanciado" name="valorFinanciado"[^>]*readonly/);
  assert.match(form,/id="valorGiroHint"[^>]*>Limite: 30%/);
  assert.match(source,/MAX_ASSOCIATED_WORKING_CAPITAL_RATE = 0\.30/);
  assert.match(source,/workingCapitalLimit = Math\.round\(budget \* MAX_ASSOCIATED_WORKING_CAPITAL_RATE \* 100\) \/ 100/);
  assert.match(source,/workingCapitalInput\.value = formatMoneyValue\(workingCapitalLimit\)/);
  assert.match(source,/valorFinanciadoBase = Math\.max\(0, valorOrcamento - recursosProprios\)/);
  assert.match(source,/valorFinanciado = valorFinanciadoBase \+ valorGiroAssociado/);
});

test('download individual possui logotipo incorporado para não contaminar o canvas', () => {
  const source = read('reports.js');
  assert.match(source,/embeddedReportLogo = 'data:image\/png;base64,/);
  assert.match(source,/return embeddedReportLogo/);
  assert.doesNotMatch(source,/catch\s*\{\s*return new URL\('logo02\.png'/);
});

test('consulta completa de CNPJ pertence somente aos utilitários', () => {
  assert.doesNotMatch(read('relatorios.html'),/companyLookupForm|consulta-cnpj/);
  assert.match(read('utilitarios.html'),/id="companyLookupPanel"/);
  assert.match(read('utilitarios.html'),/id="companyLookupForm"/);
});

test('aplicação mantém arquitetura frontend sem rotas ou integrações protegidas', () => {
  const cnpjApi = read('cnpj-api.js');
  const billing = read('faturamento.js');
  const integrations = read('redacao.js');
  const integrationsPage = read('redacao.html');
  const readme = read('README.md');
  assert.doesNotMatch(cnpjApi,/servidor local|url:\s*`\/api\//);
  assert.doesNotMatch(billing,/proxyUrl|`\/api\/sgs/);
  assert.match(billing,/fetch\(officialUrl/);
  assert.doesNotMatch(integrations,/ReceitaWS|Open Finance|SERPRO|backend protegido|status-dot--protected/);
  assert.doesNotMatch(integrationsPage,/status-dot--protected|Exige serviço protegido/);
  assert.match(integrationsPage,/a aplicação não exige backend/i);
  assert.match(readme,/Aplicação 100% frontend/);
  assert.match(readme,/Não existe rota `\/api`/);
});

test('login local da Central preserva a identificação na sessão e nos relatórios', () => {
  const page = read('index.html');
  const source = read('app.js');
  const documents = read('document-core.js');
  const footer = read('footer.js');
  assert.match(page,/id="loginForm"/);
  assert.match(page,/id="btnLogout"/);
  assert.match(source,/centralFcoSessionV1/);
  assert.match(source,/sessionStorage\.setItem\(sessionKey/);
  assert.match(source,/payload\.acesso\?\.matricula/);
  assert.match(documents,/sessionStorage/);
  assert.match(footer,/centralFcoSessionV1/);
  assert.match(read('reports.js'),/data\.acesso\.matricula/);
  assert.match(read('README.md'),/login local da Central e o controle de sessão permanecem obrigatórios/i);
});

test('código não oferece assinatura digital e preserva apenas assinatura manual dos modelos', () => {
  const sources = ['app.js','document-core.js','reports.js','relatorios.js','redacao.js','faturamento.js'].map(read).join('\n');
  assert.doesNotMatch(sources,/assinatura digital|certificado digital|ICP-Brasil|e-CPF|e-CNPJ/i);
  assert.match(read('README.md'),/espaços de assinatura manual/);
});

test('declaração de regularidade preserva a página e mantém o rodapé ancorado', () => {
  const source = read('reports.js');
  assert.match(source,/regularity-document/);
  assert.doesNotMatch(source,/\.regularity-document\{height:297mm/);
  assert.match(source,/\.regularity-document \.document-body\{font-size:10\.25pt/);
  assert.match(source,/\.document-footer\{position:absolute/);
});

test('hub oferece área própria de redação com editor modular', () => {
  const hub = read('index.html');
  const page = read('redacao.html');
  const source = read('redacao.js');
  assert.match(hub,/href="redacao\.html"/);
  assert.match(hub,/>8<\/strong><span>áreas de trabalho/);
  assert.match(page,/data-add-block="paragraph"/);
  assert.match(page,/data-add-block="table"/);
  assert.match(page,/Autorização de Faturamento/);
  assert.match(source,/rowTotals/);
  assert.match(source,/CentralDocuments\.openViewer/);
  assert.match(page,/id="sellerCnpj"/);
  assert.match(page,/id="sellerAddress"/);
  assert.match(page,/id="clientCnpj"/);
  assert.match(page,/id="creditInstrumentNumber"/);
  assert.match(source,/CnpjApi\.request\(document,\{remember:false\}\)/);
  assert.match(source,/authorizationInstructions/);
  assert.match(source,/PROPRIETÁRIO FIDUCIÁRIO ou BENEFICIÁRIO DO PENHOR/);
  assert.match(source,/id="clientLookup"|\$\('#clientLookup'\)/);
  assert.match(read('cnpj-api.js'),/options\.remember !== false/);
});

test('listas e checklists compartilham alinhamento horizontal na prévia e impressão', () => {
  const previewStyles = read('redacao.css');
  const printSource = read('redacao.js');
  const listRules = source => source.match(/\.paper-list\{[^}]*\}\.paper-list__item\{[^}]*\}\.paper-list__item>span\{[^}]*\}\.paper-list__item>p\{[^}]*\}/)?.[0];
  assert.ok(listRules(previewStyles));
  assert.equal(listRules(previewStyles), listRules(printSource));
  assert.match(listRules(previewStyles), /display:grid;grid-template-columns:minmax\(7mm,max-content\) minmax\(0,1fr\)/);
  assert.match(listRules(previewStyles), /align-items:baseline/);
  assert.match(listRules(previewStyles), /overflow-wrap:anywhere/);
});

test('hub fixa quatro colunas e redação preserva rodapé e cores na impressão', () => {
  const styles = read('styles.css');
  const pageStyles = read('redacao.css');
  const source = read('redacao.js');
  assert.match(styles,/\.hub-grid--four\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(styles,/\.hub-grid--four\{grid-template-columns:repeat\(auto-fit/);
  assert.match(pageStyles,/\.paper-footer\{position:absolute/);
  assert.match(pageStyles,/text-align:left/);
  assert.match(source,/print-color-adjust:exact!important/);
  assert.match(source,/\.paper-footer\{position:absolute/);
  assert.match(source,/background:#29298f!important/);
});

test('compactador usa seletor de arquivo estilizado e ações proporcionais', () => {
  const html = read('utilitarios.html');
  const css = read('relatorios.css');
  const source = read('relatorios-ferramentas.js');
  assert.match(html, /class="pdf-file-picker"/);
  assert.match(html, /id="pdfCompressorFileName"/);
  assert.match(html, /class="pdf-compressor-actions"/);
  assert.match(css, /\.pdf-compressor-submit\{width:auto;min-width:172px/);
  assert.match(source, /pdfCompressorFileName/);
});

test('scanner gera oportunidades e carteiras localmente com mapeamento semântico explícito', () => {
  const page = read('scanner.html');
  const source = read('scanner.js');
  const core = read('scanner-core.js');
  assert.match(page,/id="semanticMappings"/);
  assert.match(page,/id="portfolioSize"/);
  assert.match(page,/id="downloadPortfolio"/);
  assert.match(source,/CentralScanner\.analyzeOpportunities/);
  assert.match(source,/central-carteira-oportunidades\.csv/);
  assert.match(source,/semanticMappings:\s*mappingValues\(\)/);
  assert.match(source,/opportunitySettings:\s*settingValues\(\)/);
  assert.match(core,/function analyzeOpportunities/);
  assert.match(core,/falta mapear|missing/);
  assert.doesNotMatch(source,/pixVolume\s*:\s*['"]RA['"]|\[['"]pixVolume['"],\s*['"]RA['"]\]/i);
});

test('scanner preserva a identidade visual da Central e não comprime nomes de colunas', () => {
  const page = read('scanner.html');
  const styles = read('scanner.css');
  assert.match(page,/class="topbar scanner-topbar"/);
  assert.match(page,/class="brand__symbol"[^>]*>[\s\S]*logo02\.png/);
  assert.match(page,/class="scanner-hero"/);
  assert.match(page,/class="scanner-panel scanner-intelligence"/);
  assert.match(styles,/\.scanner-columns\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(styles,/\.scanner-columns label\{display:grid;grid-template-columns:20px minmax\(135px,\.8fr\) minmax\(180px,1\.2fr\)/);
  assert.match(styles,/\.scanner-columns span\{min-width:0;overflow-wrap:anywhere/);
  assert.doesNotMatch(styles,/\.scanner-columns label\{[^}]*flex:1 1 420px/);
  assert.match(styles,/\.scanner-mapping-grid label,[^{]*\.scanner-settings-grid label\{[^}]*font-weight:500/);
});

test('hub separa Scanner e Pipeline e oferece BI, tabela colunar e Kanban', () => {
  const hub = read('index.html'), scannerPage = read('scanner.html'), scannerSource = read('scanner.js');
  const pipelinePage = read('pipeline.html'), pipelineSource = read('pipeline.js'), biPage = read('scanner-bi.html');
  assert.match(hub,/href="scanner\.html"[\s\S]*<strong>Scanner<\/strong>/);
  assert.match(hub,/href="pipeline\.html"[\s\S]*<strong>Pipeline<\/strong>/);
  assert.doesNotMatch(hub,/<strong>Scanner e Pipeline<\/strong>/);
  assert.match(scannerPage,/id="openBi"/);
  assert.match(scannerSource,/centralPipelineV1/);
  assert.match(scannerSource,/centralScannerBiV1/);
  assert.match(pipelinePage,/id="viewColumns"/);
  assert.match(pipelinePage,/id="viewKanban"/);
  assert.match(pipelinePage,/id="pipelineTableBody"/);
  assert.match(pipelinePage,/id="kanbanView"/);
  assert.match(pipelineSource,/CentralPipeline\.groupByStage/);
  assert.match(biPage,/id="biOpportunityBars"/);
  assert.match(biPage,/id="biRankingBody"/);
});

test('Pipeline permite cadastrar e configurar operações sem atalho superior do Scanner', () => {
  const page = read('pipeline.html'), source = read('pipeline.js'), core = read('pipeline-core.js'), database = read('pipeline-db.js');
  assert.doesNotMatch(page, /class="header-link" href="scanner\.html"/);
  assert.match(page, /data-new-operation/);
  assert.match(page, /data-open-settings/);
  assert.match(page, /id="operationDialog"/);
  assert.match(page, /id="settingsDialog"/);
  assert.match(page, /sql\.js\/1\.13\.0\/sql-wasm\.js/);
  assert.match(source, /CentralPipelineDb\.open/);
  assert.match(database, /CREATE TABLE IF NOT EXISTS pipeline_categories/);
  assert.match(database, /CREATE TABLE IF NOT EXISTS pipeline_custom_fields/);
  assert.match(database, /indexedDB\.open/);
  assert.match(core, /FIELD_DEFINITIONS/);
  assert.match(core, /normalizeConfig/);
});

test('todos os módulos usam barras de rolagem e carregadores de arquivo padronizados', () => {
  const styles = read('styles.css');
  const scannerStyles = read('scanner.css');
  const pages = ['index.html', 'scanner.html', 'scanner-bi.html', 'pipeline.html', 'utilitarios.html', 'redacao.html', 'declaracoes.html', 'credit-lines.html', 'relatorios.html'];
  assert.match(styles, /scrollbar-width:thin/);
  assert.match(styles, /\*::-webkit-scrollbar\{width:10px;height:10px\}/);
  assert.match(styles, /\*::-webkit-scrollbar-thumb\{/);
  assert.match(styles, /input\[type="file"\]:not\(\.pdf-file-picker__input\)::file-selector-button/);
  assert.match(scannerStyles, /\.scanner-upload input\[type=file\]\{width:100%/);
  assert.match(scannerStyles, /\.scanner-columns,\.scanner-table\{scrollbar-gutter:stable\}/);
  pages.forEach(page => assert.match(read(page), /styles\.css\?v=22/));
});
