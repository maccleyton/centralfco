'use strict';

(function () {
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character]);

  const money = value => Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2
  });

  const dateLong = value => {
    const date = value ? new Date(`${value}T12:00:00`) : new Date();
    return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  };

  const dateShort = value => {
    const date = value ? new Date(`${value}T12:00:00`) : new Date();
    return new Intl.DateTimeFormat('pt-BR').format(date);
  };

  const checked = value => value ? '☒' : '☐';
  const peopleBy = (data, role) => data.pessoas.filter(person => person[role]);
  const signaturePeople = data => peopleBy(data, 'representanteLegal').length ? peopleBy(data, 'representanteLegal') : peopleBy(data, 'dirigente');

  function personAddress(person) {
    const street = [person.logradouro, person.numero].filter(Boolean).join(', ');
    const district = [person.complemento, person.bairro].filter(Boolean).join(' - ');
    const city = [person.municipio, person.uf].filter(Boolean).join('-');
    const cep = person.cep ? `CEP ${person.cep}` : '';
    return [street, district, city, cep].filter(Boolean).join(', ');
  }

  function personIdentity(person) {
    const address = personAddress(person);
    return `${escapeHtml(person.nome)}, CPF ${escapeHtml(person.cpf)}${address ? `, residente em ${escapeHtml(address)}` : ''}`;
  }

  function localDate(data) {
    return `${escapeHtml(data.emissao.local)}, ${dateLong(data.emissao.data)}`;
  }

  function agencyAddress(data) {
    const agency = data.agencia;
    return `${escapeHtml(agency.endereco)}<br>${escapeHtml(agency.bairro)} · ${escapeHtml(agency.municipio)}-${escapeHtml(agency.uf)} · CEP ${escapeHtml(agency.cep)}`;
  }

  function header(title, logo) {
    return `<header class="document-header"><img src="${logo}" alt="Banco do Brasil"><div><span>FCO EMPRESARIAL</span><strong>${escapeHtml(title)}</strong></div></header>`;
  }

  function footer() {
    return `<footer class="document-footer">CRBB: 4004-0001 (capitais e regiões metropolitanas) ou 0800 729 0001 (demais localidades).<br>SAC: 0800 729 0722 · Atendimento para Pessoas com Deficiência Auditiva ou de Fala: 0800 729 0088 · Ouvidoria BB: 0800 729 5678.</footer>`;
  }

  function documentPage(title, logo, body, className = '') {
    return `<article class="document ${className}" data-documento="${escapeHtml(title)}">${header(title, logo)}<main class="document-body">${body}</main>${footer()}</article>`;
  }

  function signatures(people, companyName, heading = '') {
    const actual = people.length ? people : [{ nome: 'Não informado', cpf: 'Não informado' }];
    return `${heading ? `<h3 class="signature-heading">${escapeHtml(heading)}</h3>` : ''}<div class="signature-grid">${actual.map(person => `
      <section class="signature">
        <div class="signature-line"></div>
        <div>Razão Social: ${escapeHtml(companyName)}</div>
        <div>Nome: ${escapeHtml(person.nome)}</div>
        <div>CPF: ${escapeHtml(person.cpf)}</div>
      </section>`).join('')}</div>`;
  }

  function authorizationDebit(data, logo) {
    const operation = data.operacao;
    const body = `
      <p><strong>Referência:</strong> ${escapeHtml(operation.propostaCop || 'Proposta FCO')}</p>
      <p>Autorizo o Banco do Brasil S.A., até a liquidação da operação, a efetuar o débito em minha conta de depósitos nº <strong>${escapeHtml(operation.contaDebito)}</strong>, agência <strong>${escapeHtml(operation.agenciaDebito)}</strong>, dos valores alusivos ao Imposto sobre Operações de Crédito, Câmbio e Seguros ou relativos a Títulos ou Valores Mobiliários (IOF) incidente de acordo com a legislação em vigor, bem como outros tributos que venham a ser instituídos e tornados exigíveis em razão da presente operação, dizendo-me ciente de que o valor correspondente ser-me-á informado mediante aviso de débito e/ou aviso no extrato de conta-corrente.</p>
      <p>Acrescento que a referida autorização se estende ao limite de crédito em conta, se houver, e alcança inclusive os pagamentos parciais ou totais de obrigações vencidas.</p>
      <p class="local-date">${localDate(data)}</p>
      ${signatures(signaturePeople(data), data.empresa.razaoSocial)}`;
    return documentPage('AUTORIZAÇÃO DE DÉBITO', logo, body);
  }

  function authorizationLgpd(data, logo) {
    const body = `
      <p>Para fins da Lei nº 13.709, de 14 de agosto de 2018 (Lei Geral de Proteção de Dados Pessoais), declaro(amos) ciente(s) que o Banco do Brasil S.A., na qualidade de agente financeiro das operações rurais com recursos provenientes do Fundo Constitucional de Financiamento do Centro-Oeste (FCO), poderá fornecer à União (ministérios e/ou secretarias), à Superintendência do Desenvolvimento do Centro-Oeste (SUDECO), ao Conselho Deliberativo do Desenvolvimento do Centro-Oeste (CONDEL/SUDECO), ao Banco Central do Brasil e demais órgãos de controle, dados pessoais necessários à execução e ao aprimoramento de políticas públicas correspondentes, bem como à fiscalização da correta aplicação dos recursos do Fundo Constitucional de Financiamento do Centro-Oeste (FCO).</p>
      <p>Além disso, considerando a Lei Complementar nº 105, de 10 de janeiro de 2001, declaro-me(nos) ciente(s) que operações contratadas com recursos do Fundo Constitucional de Financiamento do Centro-Oeste (FCO) envolvem a utilização de recursos públicos, não amparados pelo sigilo bancário e autorizo o Banco do Brasil, na qualidade de agente financeiro, a fornecer à União (ministérios e/ou secretarias), Banco Central, Secretaria Federal de Controle Interno – SFCI da Controladoria Geral da União, à Controladoria Geral da União (CGU), ao Tribunal de Contas da União (TCU), ao Ministério Público Federal e à Secretaria do Tesouro Nacional (STN), Superintendência do Desenvolvimento do Centro-Oeste (SUDECO), ao Conselho de Desenvolvimento do Centro-Oeste (CONDEL/SUDECO) e as Secretarias do Governo dos Estados que integram a área de atuação da SUDECO informações relativas a presente proposta de operação de crédito, inclusive, mas não se limitando com a finalidade de aprimoramento e execução de políticas públicas, fiscalização, registro, controle e apuração de eventuais irregularidades.</p>
      <p class="local-date">${localDate(data)}</p>
      ${signatures(signaturePeople(data), data.empresa.razaoSocial, 'Proponente(s)')}`;
    return documentPage('AUTORIZAÇÃO – LGPD/PRESTAÇÃO DE INFORMAÇÕES', logo, body);
  }

  function successDeclaration(data, logo) {
    const body = `
      <div class="address-block"><strong>${escapeHtml(data.agencia.nomeCompleto)}</strong><br>${agencyAddress(data)}</div>
      <p>Prezados Senhores,</p>
      <p>Manifesto(amos) minha(nossa) ciência e concordância de que:</p>
      <ul><li>A Carta Consulta pode não ser aprovada pelos Conselhos de Desenvolvimento Estaduais (CDE) e, ainda que aprovada, não significa que o projeto logre êxito no âmbito do Banco;</li><li>A efetiva contratação do financiamento está condicionada à prévia existência de margem orçamentária na linha de crédito por parte do alocador de recursos.</li></ul>
      <p class="local-date">${localDate(data)}</p>
      <p>Atenciosamente,</p>
      ${signatures(signaturePeople(data), data.empresa.razaoSocial)}`;
    return documentPage('DECLARAÇÃO DE CIÊNCIA SOBRE O ÊXITO DO PROJETO', logo, body);
  }

  function absenceOperations(data, logo) {
    const company = data.empresa;
    const body = `
      <p>Declaro(amos), para os devidos fins e sob as penas da Lei, que a empresa <strong>${escapeHtml(company.razaoSocial)}</strong>, com sede em ${escapeHtml(company.enderecoCompleto)}, inscrita no CNPJ/MF sob o nº ${escapeHtml(company.cnpjFormatado)}, não possui operação(ões) em ser, nem em processo de contratação, com fonte de recursos de FCO, em outra(s) instituição(ões) financeira(s), nas linhas de crédito de Infraestrutura, Comércio e Serviço e Indústria, para aquisição de veículos pesados, como pás carregadeiras, empilhadeiras, máquinas de escavar, retroescavadeiras ou escavadeiras, motoniveladoras, tratores, rolos compactadores e vibroacabadoras, cuja quantidade financiada somada a esta operação supere 3 (três) unidades, de acordo com o disposto na Resolução do CEDEM nº 072, de 30.09.2014.</p>
      <p class="local-date">${localDate(data)}</p>
      ${signatures(signaturePeople(data), company.razaoSocial)}`;
    return documentPage('DECLARAÇÃO DE INEXISTÊNCIA DE OPERAÇÕES SIMILARES E AUSÊNCIA DE VÍNCULO', logo, body);
  }

  function condemnation(data, logo) {
    const company = data.empresa;
    const people = data.pessoas.filter(person => person.dirigente || person.representanteLegal);
    const identities = people.map(personIdentity).join('; ') || 'Não informado';
    const singular = people.length === 1;
    const possessive = singular ? 'SEU(SUA)' : 'SEUS(SUAS)';
    const legalRole = singular ? 'representante legal' : 'representantes legais';
    const directorRole = singular ? 'dirigente' : 'dirigentes';
    const declarationVerb = singular ? 'DECLARA' : 'DECLARAM';
    const body = `
      <p><strong>${escapeHtml(company.razaoSocial)}</strong>, ${escapeHtml(company.naturezaJuridica)}, com sede em ${escapeHtml(company.enderecoCompleto)}, inscrita no CNPJ sob o nº ${escapeHtml(company.cnpjFormatado)}, neste ato representada por ${possessive} ${legalRole} ${identities}, e ${possessive} ${directorRole} ${identities}, ${declarationVerb} ao Banco do Brasil S.A. que inexiste contra si decisão administrativa final sancionadora e/ou sentença condenatória transitada em julgado, exarada por autoridade ou órgão competente, em razão da prática de atos que importem em discriminação de raça, cor, etnia, religião, procedência nacional ou gênero, trabalho infantil, trabalho escravo, assédio moral ou sexual, crime contra o meio ambiente ou violência contra a mulher.</p>
      <p>Os representantes legais da declarante estão cientes de que a falsidade da declaração ora prestada acarretará o vencimento antecipado do instrumento contratual no qual se formalizar a colaboração financeira do FCO Empresarial, sem prejuízo da aplicação das sanções legais cabíveis, de natureza civil e penal.</p>
      <p class="local-date">${localDate(data)}</p>
      ${signatures(people, company.razaoSocial, singular ? 'Representante legal' : 'Representantes legais')}
      ${signatures(people, company.razaoSocial, singular ? 'Dirigente' : 'Dirigentes')}`;
    return documentPage('DECLARAÇÃO DE INEXISTÊNCIA DE CONDENAÇÃO', logo, body);
  }

  function regularity(data, logo) {
    const beneficiary = data.declaracoes.situacaoFundos === 'beneficiaria';
    const funds = new Set(data.declaracoes.fundos || []);
    const body = `
      <div class="address-block"><strong>${escapeHtml(data.agencia.nomeCompleto)}</strong><br>${agencyAddress(data)}</div>
      <p>Ao Banco do Brasil S.A.</p>
      <p>A propósito da exigência estipulada na Lei nº 7.827/89, art. 4º, § 2º, que, para a obtenção de financiamento ao amparo do Fundo Constitucional do Centro-Oeste (FCO), condiciona a regularidade de situação para com a Comissão de Valores Mobiliários (CVM) e com os fundos abaixo relacionados:</p>
      <ul><li>Fundo de Investimento do Nordeste – Finor;</li><li>Fundo de Investimento da Amazônia – Finam; e</li><li>Fundo de Recuperação Econômica do Estado do Espírito Santo – Funres.</li></ul>
      <p>DECLARAMOS que esta empresa:</p>
      <div class="checks"><div>${checked(!beneficiary)} NÃO é beneficiária dos fundos acima citados.</div><div>${checked(beneficiary)} É beneficiária daquele(s) fundo(s), a saber:</div><div>${checked(funds.has('finor'))} Fundo de Investimento do Nordeste (FINOR)<small>Certidão fornecida pela Inventariança Extrajudicial da extinta SUDENE.</small></div><div>${checked(funds.has('finam'))} Fundo de Investimento da Amazônia (FINAM)<small>Certidão fornecida pela Inventariança Extrajudicial da extinta SUDAM.</small></div><div>${checked(funds.has('funres'))} Fundo de Recuperação Econômica do Estado do Espírito Santo (FUNRES)<small>Certidão fornecida pelo Grupo Executivo para Recuperação Econômica do Estado do Espírito Santo (GERES).</small></div></div>
      <p>Comprovando nossa regularidade de situação, anexamos certidão emitida pelo(s) fundo(s) acima assinalado(s) e pela Comissão de Valores Mobiliários (CVM).</p>
      <p class="local-date">${localDate(data)}</p>
      <p>Atenciosamente,</p>
      ${signatures(signaturePeople(data), data.empresa.razaoSocial)}`;
    return documentPage('DECLARAÇÃO DE REGULARIDADE JUNTO À CVM E AOS FUNDOS', logo, body);
  }

  function guaranteeTables(data) {
    const directors = peopleBy(data, 'dirigente').map(person => [person.nome, person.cpf]);
    const personal = data.operacao.garantias.filter(item => item.categoria === 'pessoal').map(item => item.pessoaTipo === 'pj' ? [item.razaoSocial, item.cnpj] : [item.nome, item.cpf]);
    const real = data.operacao.garantias.filter(item => item.categoria === 'real').map(item => [`${item.bemTipo}: ${item.descricao}`, `${item.percentualVinculo}%`]);
    const rows = values => (values.length ? values : [['Nenhuma garantia adicional informada', '-']]).map(row => `<tr><td>${escapeHtml(row[0])}</td><td>${escapeHtml(row[1])}</td></tr>`).join('');
    return `<h2>3. Garantia(s) proposta(s)</h2><table><thead><tr><th colspan="2">Garantias Fidejussórias</th></tr><tr><th>Nome ou Razão Social</th><th>CPF/CNPJ</th></tr></thead><tbody>${rows([...directors, ...personal])}</tbody></table><table><thead><tr><th colspan="2">Garantias Reais</th></tr><tr><th>Tipo de Garantia</th><th>Percentual (%)</th></tr></thead><tbody>${rows(real)}</tbody></table>`;
  }

  function protocol(data) {
    return `<aside class="protocol"><strong>PROTOCOLO</strong><div>Recebido por: ${escapeHtml(data.acesso.matricula)}</div><div>${escapeHtml(data.acesso.nome)}</div><div>Data de Recebimento: ${dateShort(data.emissao.data)}</div><div>Agência: ${escapeHtml(data.agencia.prefixo)} - ${escapeHtml(data.agencia.nome)}</div></aside>`;
  }

  function proposal(data, logo) {
    const operation = data.operacao;
    const investment = operation.tipo === 'investimento';
    const modalities = new Set(operation.modalidades || []);
    const purposes = new Set(operation.finalidadesGiro || []);
    const purpose = investment
      ? `${checked(modalities.has('implantacao'))} Implantação &nbsp; ${checked(modalities.has('ampliacao'))} Ampliação &nbsp; ${checked(modalities.has('modernizacao'))} Modernização &nbsp; ${checked(modalities.has('reforma'))} Reforma`
      : `${checked(purposes.has('estoques'))} aquisição de insumos e/ou matéria-prima &nbsp; ${checked(purposes.has('gastos_gerais'))} gastos gerais relativos à administração`;
    const body = `${protocol(data)}
      <section class="proposal-identification"><h2>1. Identificação</h2><dl class="proposal-data"><dt>Razão Social:</dt><dd>${escapeHtml(data.empresa.razaoSocial)}</dd><dt>CNPJ:</dt><dd>${escapeHtml(data.empresa.cnpjFormatado)}</dd></dl></section>
      <h2>2. Proposta</h2><dl class="proposal-data"><dt>Proposta COP:</dt><dd>${escapeHtml(operation.propostaCop || 'Não informada')}</dd><dt>Linha de crédito:</dt><dd>${escapeHtml(operation.linhaCredito)}</dd><dt>Finalidade:</dt><dd>${purpose}</dd><dt>Descrição:</dt><dd>${escapeHtml([operation.finalidade, operation.descricao].filter(Boolean).join('. '))}</dd><dt>Valor do orçamento:</dt><dd>${money(operation.valorOrcamento)}</dd>${investment ? `<dt>Giro associado:</dt><dd>${checked(operation.giroAssociado)} Sim &nbsp; ${checked(!operation.giroAssociado)} Não</dd><dt>Valor do giro:</dt><dd>${operation.giroAssociado ? money(operation.valorGiroAssociado) : 'Não se aplica'}</dd>` : ''}<dt>Valor a financiar:</dt><dd>${money(operation.valorFinanciado)}</dd><dt>Recursos próprios:</dt><dd>${money(operation.recursosProprios)}</dd><dt>Prazo:</dt><dd>${escapeHtml(operation.prazoTotalMeses)} meses, incluídos ${escapeHtml(operation.carenciaMeses)} meses de carência</dd>${investment ? `<dt>Localização:</dt><dd>${escapeHtml(operation.localEmpreendimento || data.empresa.enderecoCompleto)}</dd>` : ''}</dl>
      ${guaranteeTables(data)}<p class="local-date">${localDate(data)}</p>${signatures(peopleBy(data, 'dirigente'), data.empresa.razaoSocial, 'Dirigentes')}`;
    const title = investment ? 'PROPOSTA DE FINANCIAMENTO – FCO INVESTIMENTO' : 'PROPOSTA DE FINANCIAMENTO – FCO CAPITAL DE GIRO DISSOCIADO';
    return documentPage(title, logo, body, 'proposal-document');
  }

  function dossierCss() {
    return `
      @page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#e9ebf2;color:#111;font-family:Calibri,Arial,sans-serif;font-size:11pt}.toolbar{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:12px 22px;background:#20206f;color:#fff;box-shadow:0 3px 15px #0003}.toolbar button{border:0;border-radius:8px;padding:10px 18px;background:#fff32b;color:#17175f;font:700 14px Calibri,Arial;cursor:pointer}.document{position:relative;width:210mm;min-height:297mm;margin:12mm auto;background:#fff;padding:13mm 18mm 27mm;box-shadow:0 4px 24px #0002;break-after:page;page-break-after:always}.document-header{height:18mm;display:flex;align-items:center;gap:6mm;border-bottom:1.5pt solid #2037a0;margin-bottom:6mm;padding-bottom:2.5mm}.document-header img{width:22mm;height:12mm;object-fit:contain}.document-header span,.document-header strong{display:block}.document-header span{font-size:7.5pt;letter-spacing:.12em;color:#555}.document-header strong{font-size:13pt;margin-top:1mm}.document-body{line-height:1.45}.document-body p{text-align:justify;margin:0 0 5mm}.document-body h2{font-size:12pt;margin:6mm 0 3mm}.document-body ul{margin:0 0 6mm;padding-left:7mm}.document-body li{margin-bottom:3mm}.document-footer{position:absolute;left:18mm;right:18mm;bottom:10mm;padding-top:2.5mm;border-top:.6pt solid #aaa;font-size:7.5pt;line-height:1.25;color:#333}.address-block{margin-bottom:7mm}.local-date{text-align:left!important;margin-top:7mm!important}.signature-heading{font-size:11pt;margin:7mm 0 1mm;break-after:avoid}.signature-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:10mm;row-gap:7mm;break-inside:auto}.signature{font-size:11pt;line-height:1.28;break-inside:avoid}.signature-line{width:100%;height:14mm;border-bottom:1pt solid #111;margin-bottom:2mm}.checks{display:grid;gap:2.5mm;margin:5mm 0 7mm}.checks small{display:block;margin:1mm 0 0 6mm}.proposal-document{padding-top:11mm;padding-bottom:20mm}.proposal-document .document-header{margin-bottom:4mm}.proposal-document .document-body{position:relative;line-height:1.3}.proposal-document .document-body h2{margin:3mm 0 2mm}.proposal-identification{padding-right:58mm;margin-bottom:3mm}.proposal-identification h2{margin-top:0!important}.protocol{position:absolute;z-index:2;top:0;right:0;width:52mm;margin:0;padding:0 1mm;font-size:8.5pt;line-height:1.35;background:#fff}.protocol strong{display:block;font-size:10pt;margin-bottom:2mm}.proposal-data{display:grid;grid-template-columns:36mm minmax(0,1fr);gap:1.2mm 3mm;margin:0 0 3mm}.proposal-data dt{font-weight:700}.proposal-data dd{margin:0}.proposal-document table{margin:2.5mm 0 3mm}.proposal-document th,.proposal-document td{padding:1.5mm 2mm}.proposal-document .local-date{margin-top:3mm!important;margin-bottom:0!important}.proposal-document .signature-heading{margin-top:2mm}.proposal-document .signature-grid{row-gap:4mm}.proposal-document .signature-line{height:10mm}table{width:100%;border-collapse:collapse;margin:4mm 0 5mm;font-size:9.5pt;break-inside:auto}th,td{border:.7pt solid #222;padding:2mm 2.5mm;text-align:left}thead th{background:#e5e5e5}thead tr:first-child th{background:#3333bd;color:#fff;font-size:10pt}th:last-child,td:last-child{width:25%}@media print{body{background:#fff}.toolbar{display:none}.document{margin:0;box-shadow:none}}`;
  }

  async function logoDataUrl() {
    try {
      const response = await fetch(new URL('logo02.png', window.location.href));
      const blob = await response.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return new URL('logo02.png', window.location.href).href;
    }
  }

  async function renderDossier(data) {
    const logo = await logoDataUrl();
    const documents = [
      authorizationDebit(data, logo), authorizationLgpd(data, logo), successDeclaration(data, logo),
      absenceOperations(data, logo), condemnation(data, logo), regularity(data, logo), proposal(data, logo)
    ].join('');
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dossiê FCO - ${escapeHtml(data.empresa.razaoSocial)}</title><style>${dossierCss()}</style></head><body><div class="toolbar"><strong>Dossiê FCO · ${escapeHtml(data.empresa.razaoSocial)}</strong><button onclick="window.print()">Imprimir / Salvar em PDF</button></div>${documents}</body></html>`;
  }

  window.FCOReports = { renderDossier };
})();
