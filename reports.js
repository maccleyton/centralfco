'use strict';

(function () {
  const embeddedReportLogo = 'data:image/png;base64,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';
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character]);

  const moneyOnly = value => Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2
  });

  const extensoAteDezenove = "zero|um|dois|tres|quatro|cinco|seis|sete|oito|nove".split("|");

  extensoAteDezenove.push(..."dez|onze|doze|treze|quatorze|quinze".split("|"));

  extensoAteDezenove.push(..."dezesseis|dezessete|dezoito|dezenove".split("|"));

  const extensoDezenas = "||vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa".split("|");
  const extensoCentenas = "|cento|duzentos|trezentos|quatrocentos".split("|");
  extensoCentenas.push(..."quinhentos|seiscentos|setecentos|oitocentos|novecentos".split("|"));

  function extensoAteMil(value) {
    if (value === 100) return "cem";
    const partes = [];
    const centena = Math.floor(value / 100);
    const resto = value % 100;
    if (centena) partes.push(extensoCentenas[centena]);
    if (resto) partes.push(resto < 20 ? extensoAteDezenove[resto] : extensoDezenas[Math.floor(resto / 10)] + (resto % 10 ? " e " + extensoAteDezenove[resto % 10] : ""));
    return partes.join(" e ");
  }

  function inteiroPorExtenso(value) {
    let numero = Math.floor(Math.abs(value));
    if (!numero) return "zero";
    const escalas = [[1000000000000, "trilh\u00e3o", "trilh\u00f5es"], [1000000000, "bilh\u00e3o", "bilh\u00f5es"], [1000000, "milh\u00e3o", "milh\u00f5es"], [1000, "mil", "mil"]];
    const partes = [];
    escalas.forEach(([divisor, singular, plural]) => {
      const quantidade = Math.floor(numero / divisor);
      if (!quantidade) return;
      partes.push((divisor === 1000 && quantidade === 1 ? "" : inteiroPorExtenso(quantidade) + " ") + (quantidade === 1 ? singular : plural));
      numero %= divisor;
    });
    if (numero) partes.push(extensoAteMil(numero));
    return partes.join(" e ");
  }

  extensoAteDezenove[3] = "tr\u00eas";

  function valorPorExtenso(value) {
    const centavosTotais = Math.round(Math.abs(Number(value || 0)) * 100);
    const reais = Math.floor(centavosTotais / 100);
    const centavos = centavosTotais % 100;
    let resultado = inteiroPorExtenso(reais) + (reais === 1 ? " real" : " reais");
    if (centavos) resultado += " e " + inteiroPorExtenso(centavos) + (centavos === 1 ? " centavo" : " centavos");
    return resultado;
  }

  const money = value => moneyOnly(value) + " (" + valorPorExtenso(value) + ")";

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
  const lowercaseNameWords = new Set(['da', 'do', 'das', 'dos', 'de', 'com']);
  const properName = value => String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR').split(' ').map(word => {
    if (lowercaseNameWords.has(word)) return word;
    return word.replace(/(^|[-'’])\p{L}/gu, match => match.toLocaleUpperCase('pt-BR'));
  }).join(' ');

  function personAddress(person) {
    const street = [person.logradouro, person.numero].filter(Boolean).join(', ');
    const district = [person.complemento, person.bairro].filter(Boolean).join(' - ');
    const city = [person.municipio, person.uf].filter(Boolean).join('-');
    const cep = person.cep ? `CEP ${person.cep}` : '';
    return [street, district, city, cep].filter(Boolean).join(', ');
  }

  function personIdentity(person) {
    const address = personAddress(person);
    return `${escapeHtml(properName(person.nome))}, CPF ${escapeHtml(person.cpf)}${address ? `, domiciliado na ${escapeHtml(address)}` : ''}`;
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
    return window.CentralDocuments.supportFooter('document-footer');
  }

  function documentPage(title, logo, body, className = '') {
    return `<article class="document ${className}" data-documento="${escapeHtml(title)}">${header(title, logo)}<main class="document-body">${body}</main>${footer()}</article>`;
  }

  function signatures(people, companyName, heading = '') {
    const actual = people.length ? people : [{ nome: 'Não informado', cpf: 'Não informado' }];
    return `<section class="signature-block">${heading ? `<h3 class="signature-heading">${escapeHtml(heading)}</h3>` : ''}<div class="signature-grid">${actual.map(person => `
      <section class="signature">
        <div class="signature-line"></div>
        <div>${escapeHtml(String(companyName ?? '').toLocaleUpperCase('pt-BR'))}</div>
        <div>${escapeHtml(String(person.nome ?? '').toLocaleUpperCase('pt-BR'))}</div>
        <div>CPF: ${escapeHtml(person.cpf)}</div>
      </section>`).join('')}</div></section>`;
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
      <p><strong>${escapeHtml(company.razaoSocial)}</strong>, ${escapeHtml(company.naturezaJuridica)}, sediada na ${escapeHtml(company.enderecoCompleto)}, inscrita no CNPJ sob o nº ${escapeHtml(company.cnpjFormatado)}, neste ato representada por ${possessive} ${legalRole} ${identities}, e ${possessive} ${directorRole} ${identities}, ${declarationVerb} ao Banco do Brasil S.A. que inexiste contra si decisão administrativa final sancionadora e/ou sentença condenatória transitada em julgado, exarada por autoridade ou órgão competente, em razão da prática de atos que importem em discriminação de raça, cor, etnia, religião, procedência nacional ou gênero, trabalho infantil, trabalho escravo, assédio moral ou sexual, crime contra o meio ambiente ou violência contra a mulher.</p>
      <p>Os representantes legais da declarante estão cientes de que a falsidade da declaração ora prestada acarretará o vencimento antecipado do instrumento contratual no qual se formalizar a colaboração financeira do FCO Empresarial, sem prejuízo da aplicação das sanções legais cabíveis, de natureza civil e penal.</p>
      <p class="local-date">${localDate(data)}</p>
      ${signatures(people, company.razaoSocial, singular ? 'Representante legal' : 'Representantes legais')}
      ${signatures(people, company.razaoSocial, singular ? 'Dirigente' : 'Dirigentes')}`;
    return documentPage('DECLARAÇÃO DE INEXISTÊNCIA DE CONDENAÇÃO POR TRABALHO INFANTIL, TRABALHO ESCRAVO, CRIME CONTRA O MEIO AMBIENTE, ASSÉDIO MORAL OU SEXUAL, VIOLÊNCIA CONTRA A MULHER, OU RACIAL E DE ETNIA', logo, body);
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
    return documentPage('DECLARAÇÃO DE REGULARIDADE JUNTO À CVM E AOS FUNDOS', logo, body, 'regularity-document');
  }

  function simplesDeclaration(data, logo) {
    const company = data.empresa;
    const address = company.endereco || {};
    const body = `
      <h2>Empresa Optante pelo Simples Nacional</h2>
      <p><strong>${escapeHtml(company.razaoSocial)}</strong>, com sede na <strong>${escapeHtml(company.enderecoCompleto)}</strong>, inscrita no CNPJ sob o nº <strong>${escapeHtml(company.cnpjFormatado)}</strong>, para fins de redução de alíquota, nas operações de crédito que tenham como mutuário pessoa jurídica optante pelo Regime Especial Unificado de Arrecadação de Tributos e Contribuições devidos pelas Microempresas e Empresas de Pequeno Porte - Simples Nacional, prevista no art. 7º, VI, do Decreto nº 6.306, de 14 de dezembro de 2007, declara que:</p>
      <ol type="a"><li>se enquadra como pessoa jurídica optante pelo Simples Nacional de que trata a Lei Complementar nº 123, de 14.12.2006; e</li><li>o(a) signatário(a) é representante legal desta entidade, assumindo o compromisso de informar a essa instituição financeira, imediatamente, eventual desenquadramento da presente situação, e está ciente de que a falsidade na prestação destas informações o(a) sujeitará, juntamente com as demais pessoas que a ela concorrerem, às penalidades previstas na legislação criminal e tributária, relativas à falsidade ideológica (art. 299 do Código Penal) e ao crime contra a ordem tributária (art. 1º da Lei nº 8.137, de dezembro de 1990).</li></ol>
      <p class="local-date">${escapeHtml(address.municipio)}-${escapeHtml(address.uf)}, ${escapeHtml(dateLong(data.emissao.data))}.</p>
      ${signatures(peopleBy(data, 'dirigente'), company.razaoSocial, 'Dirigente(s)')}`;
    return documentPage('DECLARAÇÃO DE OPTANTE PELO SIMPLES NACIONAL', logo, body);
  }

  function guaranteeTables(data) {
    const directors = peopleBy(data, 'dirigente').map(person => [properName(person.nome), person.cpf]);
    const personal = data.operacao.garantias.filter(item => item.categoria === 'pessoal').map(item => item.pessoaTipo === 'pj' ? [item.razaoSocial, item.cnpj] : [properName(item.nome), item.cpf]);
    const real = data.operacao.garantias.filter(item => item.categoria === 'real').map(item => [item.descricao, `${item.percentualVinculo}%`]);
    const rows = values => (values.length ? values : [['Nenhuma garantia adicional informada', '-']]).map(row => `<tr><td>${escapeHtml(row[0])}</td><td>${escapeHtml(row[1])}</td></tr>`).join('');
    return `<h2>3. Garantia(s) proposta(s)</h2><table><thead><tr><th colspan="2">Garantias Fidejussórias</th></tr><tr><th>Nome ou Razão Social</th><th>CPF/CNPJ</th></tr></thead><tbody>${rows([...directors, ...personal])}</tbody></table><table><thead><tr><th colspan="2">Garantias Reais</th></tr><tr><th>Tipo de Garantia</th><th>Percentual (%)</th></tr></thead><tbody>${rows(real)}</tbody></table>`;
  }

  function proposalOtherInformation() {
    return {
      firstPage: '<section class="proposal-other-info"><h2>4. Outras informações</h2><p>Para fins da Lei 13709, de 14 de agosto de 2018 (Lei Geral de Proteção de Dados Pessoais) me(nos) declaro(amos) ciente(s) de que o Banco do Brasil S.A., na qualidade de agente financeiro das operações rurais e empresariais com recursos provenientes do Fundo Constitucional de Financiamento do Centro-Oeste (FCO), poderá fornecer à União (ministérios e/ou secretarias), à Superintendência do Desenvolvimento do Centro-Oeste (SUDECO), ao Conselho Deliberativo do Desenvolvimento do Centro-Oeste (CONDEL/SUDECO), ao Banco Central do Brasil e demais órgãos de controle, dados pessoais necessários à execução e ao aprimoramento de políticas públicas correspondentes, bem como à fiscalização da correta aplicação dos recursos do Fundo Constitucional de Financiamento do Centro Oeste (FCO).</p></section>',
      continuation: '<section class="proposal-other-info proposal-other-info--continuation"><p>Além disso, considerando a Lei Complementar 105, de 10 de janeiro de 2001, declaro-me(nos) ciente(s) que operações contratadas com recursos do Fundo Constitucional de Financiamento do Centro Oeste (FCO) envolvem a utilização de recursos públicos, não amparados pelo sigilo bancário, e autorizo o Banco do Brasil, na qualidade de agente financeiro, a fornecer à União (ministérios e/ou secretarias), Banco Central, Secretaria Federal de Controle Interno – SFCI da Controladoria Geral da União, à Controladoria Geral da União (CGU), ao Tribunal de Contas da União (TCU), ao Ministério Público Federal e à Secretaria do Tesouro Nacional (STN), Superintendência do Desenvolvimento do Centro Oeste (SUDECO), ao Conselho de Desenvolvimento do Centro-Oeste (Condel/Sudeco) e às secretarias do governo dos Estados que integram a área de atuação da Sudeco, informações relativas à presente proposta de operação de crédito, inclusive, mas não se limitando, com a finalidade de aprimoramento e execução de políticas públicas, fiscalização, registro, controle e apuração de eventuais irregularidades. Manifesto(amos) minha(nossa) ciência que a aprovação da presente proposta depende de análise de crédito do Banco do Brasil, bem como enquadramento nas regras do Fundo Constitucional de Financiamento do Centro-Oeste (FCO).</p></section>'
    };
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
    const otherInformation = proposalOtherInformation();
    const firstPageBody = `${protocol(data)}
      <section class="proposal-identification"><h2>1. Identificação</h2><dl class="proposal-data"><dt>Razão Social:</dt><dd>${escapeHtml(data.empresa.razaoSocial)}</dd><dt>CNPJ:</dt><dd>${escapeHtml(data.empresa.cnpjFormatado)}</dd></dl></section>
      <h2>2. Proposta</h2><dl class="proposal-data"><dt>Proposta COP:</dt><dd>${escapeHtml(operation.propostaCop || 'Não informada')}</dd><dt>Linha de crédito:</dt><dd>${escapeHtml(operation.linhaCredito)}</dd><dt>Condição especial:</dt><dd>${operation.fcoMulher ? 'FCO Mulher' : 'Não se aplica'}</dd><dt>Finalidade:</dt><dd>${escapeHtml(operation.finalidade)}<div class="proposal-purpose-options">${purpose}</div></dd><dt>Descrição:</dt><dd>${escapeHtml(operation.descricao)}</dd><dt>Valor do orçamento:</dt><dd>${money(operation.valorOrcamento)}</dd><dt>Recursos próprios:</dt><dd>${money(operation.recursosProprios)}</dd>${investment ? `<dt>Giro associado:</dt><dd>${checked(operation.giroAssociado)} Sim &nbsp; ${checked(!operation.giroAssociado)} Não</dd><dt>Valor do giro:</dt><dd>${operation.giroAssociado ? money(operation.valorGiroAssociado) : 'Não se aplica'}</dd>` : ''}<dt>Valor a financiar:</dt><dd>${money(operation.valorFinanciado)}</dd><dt>Prazo:</dt><dd>${escapeHtml(operation.prazoTotalMeses)} meses (sendo ${escapeHtml(operation.carenciaMeses)} meses de carência e ${escapeHtml(Math.max(0, Number(operation.prazoTotalMeses) - Number(operation.carenciaMeses)))} meses de reposição)</dd>${investment ? `<dt>Localização:</dt><dd>${escapeHtml(operation.localEmpreendimento || data.empresa.enderecoCompleto)}</dd>` : ''}</dl>
      ${guaranteeTables(data)}${otherInformation.firstPage}`;
    const secondPageBody = `${otherInformation.continuation}<p class="local-date">${localDate(data)}</p>${signatures(peopleBy(data, 'dirigente'), data.empresa.razaoSocial, 'Dirigentes')}`;
    const title = investment ? 'PROPOSTA DE FINANCIAMENTO – FCO INVESTIMENTO' : 'PROPOSTA DE FINANCIAMENTO – FCO CAPITAL DE GIRO DISSOCIADO';
    return `${documentPage(title, logo, firstPageBody, 'proposal-document proposal-document--first')}${documentPage(title, logo, secondPageBody, 'proposal-document proposal-document--continuation')}`;
  }

  function dossierFontCss() {
    return window.CentralDocuments.fontCss(window.location.href);
  }

  function dossierCss() {
    return `
      @page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#e9ebf2;color:#111;font-family:Calibri,Arial,sans-serif;font-size:11pt}.toolbar{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:12px 22px;background:#20206f;color:#fff;box-shadow:0 3px 15px #0003}.toolbar button{border:0;border-radius:8px;padding:10px 18px;background:#fff32b;color:#17175f;font:700 14px Calibri,Arial;cursor:pointer}.document{position:relative;width:210mm;min-height:297mm;margin:12mm auto;background:#fff;padding:13mm 18mm 27mm;box-shadow:0 4px 24px #0002;break-after:page;page-break-after:always}.document-header{height:18mm;display:flex;align-items:center;gap:6mm;border-bottom:1.5pt solid #2037a0;margin-bottom:6mm;padding-bottom:2.5mm}.document-header img{flex:0 0 12mm;width:12mm;height:12mm}.document-header>div{min-width:0}.document-header span,.document-header strong{display:block}.document-header span{font-size:7.5pt;letter-spacing:.12em;color:#555}.document-header strong{font-size:13pt;line-height:1.08;margin-top:1mm}.document-body{line-height:1.45}.document-body p{text-align:justify;margin:0 0 5mm}.document-body h2{font-size:12pt;margin:6mm 0 3mm}.document-body ul{margin:0 0 6mm;padding-left:7mm}.document-body li{margin-bottom:3mm}.document-footer{position:absolute;left:18mm;right:18mm;bottom:10mm;padding-top:2.5mm;border-top:.6pt solid #aaa;font-size:7.5pt;line-height:1.25;color:#333}.address-block{margin-bottom:7mm}.local-date{text-align:left!important;margin-top:7mm!important}.signature-heading{font-size:11pt;margin:7mm 0 1mm;break-after:avoid}.signature-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:10mm;row-gap:7mm;break-inside:auto}.signature{font-size:11pt;line-height:1.28;break-inside:avoid}.signature-line{width:100%;height:14mm;border-bottom:1pt solid #111;margin-bottom:2mm}.checks{display:grid;gap:2.5mm;margin:5mm 0 7mm}.checks small{display:block;margin:1mm 0 0 6mm}.proposal-document{padding-top:10mm;padding-bottom:20mm}.proposal-document .document-header{height:16mm;margin-bottom:4mm}.proposal-document .document-body{position:relative}.proposal-document .document-body h2{margin:3mm 0 2mm}.proposal-identification{padding-right:58mm;margin-bottom:3mm}.proposal-identification h2{margin-top:0!important}.protocol{position:absolute;z-index:2;top:0;right:0;width:52mm;margin:0;padding:0 1mm;font-size:9.5pt;line-height:1.45;background:#fff}.protocol strong{display:block;font-size:11pt;margin-bottom:2mm}.proposal-data{display:grid;grid-template-columns:40mm minmax(0,1fr);gap:1.2mm 3mm;margin:0 0 3mm}.proposal-data dt{font-weight:700}.proposal-data dd{margin:0}.proposal-document table{margin:2.5mm 0 3mm}.proposal-document th,.proposal-document td{padding:1.5mm 2mm}.proposal-document .local-date{margin-top:3mm!important;margin-bottom:0!important}.proposal-document .signature-heading{margin-top:2mm}.proposal-document .signature-grid{row-gap:4mm}.proposal-document .signature-line{height:10mm}table{width:100%;border-collapse:collapse;margin:4mm 0 5mm;font-size:9.5pt;break-inside:auto}th,td{border:.7pt solid #222;padding:2mm 2.5mm;text-align:left}thead th{background:#e5e5e5}thead tr:first-child th{background:#3333bd;color:#fff;font-size:10pt}th:last-child,td:last-child{width:25%}@media print{body{background:#fff}.toolbar{display:none}.document{margin:0;box-shadow:none}}`;
  }

  function dossierPrintFixCss() {
    return `
      ${dossierFontCss()}
      body{font-family:"BB Textos",Arial,sans-serif}
      h1,h2,h3,.document-header strong,.signature-heading,.toolbar strong{font-family:"BB Títulos","BB Textos",Arial,sans-serif}
      .toolbar button{font-family:"BB Títulos","BB Textos",Arial,sans-serif}
      *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      thead th{background:#e5e5e5!important;color:#111!important}
      thead tr:first-child th{background:#3333bd!important;color:#fff!important}
      .signature-block{break-inside:avoid;page-break-inside:avoid}
      .regularity-document{break-inside:avoid;page-break-inside:avoid}
      .regularity-document .address-block{margin-bottom:5mm}
      .regularity-document .document-body{font-size:10.25pt;line-height:1.36}
      .regularity-document .document-body p{margin-bottom:3.5mm}
      .regularity-document .document-body ul{margin-bottom:4mm}
      .regularity-document .document-body li{margin-bottom:1.5mm}
      .regularity-document .checks{gap:1.4mm;margin:3.5mm 0 4mm}
      .regularity-document .checks small{margin-top:.7mm}
      .regularity-document .local-date{margin-top:5mm!important}
      .regularity-document .signature-heading{margin-top:4mm}
      .regularity-document .signature-grid{row-gap:5mm}
      .regularity-document .signature-line{height:12mm}
      .proposal-document .signature-line{height:20mm}
      .proposal-purpose-options{margin-top:1.5mm}
      .proposal-other-info{break-inside:auto;page-break-inside:auto}
      .proposal-other-info p{margin-bottom:3mm;font-size:9.5pt;line-height:1.28;text-align:justify}
      @media print{.document{margin:0;box-shadow:none}.regularity-document{break-inside:avoid!important;page-break-inside:avoid!important}.proposal-document{min-height:297mm;overflow:visible;break-after:auto!important;page-break-after:auto!important}.proposal-document--continuation{break-before:page!important;page-break-before:always!important}.signature-block,.signature-grid,.signature{break-inside:avoid!important;page-break-inside:avoid!important}}
    `;
  }

  async function logoDataUrl() {
    try {
      const response = await fetch(new URL('logo02.png', window.location.href));
      if (!response.ok) throw new Error(`Falha ao carregar o logotipo (${response.status}).`);
      const blob = await response.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return embeddedReportLogo;
    }
  }

  async function renderDossier(data) {
    const logo = await logoDataUrl();
    const optionalSimples = data.empresa.simplesOptante === true ? [simplesDeclaration(data, logo)] : [];
    const documents = [
      authorizationDebit(data, logo), authorizationLgpd(data, logo), successDeclaration(data, logo),
      absenceOperations(data, logo), condemnation(data, logo), regularity(data, logo),
      ...optionalSimples, proposal(data, logo)
    ].join('');
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dossiê FCO - ${escapeHtml(data.empresa.razaoSocial)}</title><style>${dossierCss()}${dossierPrintFixCss()}</style></head><body>${documents}</body></html>`;
  }

  window.FCOReports = { renderDossier };
})();
