(function () {
  'use strict';

  const STORAGE_KEY = 'centralEmpresasWritingDraftV1';
  const $ = selector => document.querySelector(selector);
  const esc = value => window.CentralDocuments.escapeHtml(value);
  const uid = () => window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const labels = { oficio:'OFÍCIO', memorando:'MEMORANDO', parecer:'PARECER', relatorio:'RELATÓRIO', portaria:'PORTARIA', autorizacao_faturamento:'AUTORIZAÇÃO DE FATURAMENTO' };
  const integrations = [
    ['BrasilAPI','ready','CNPJ, CEP e bancos','Ativa no navegador, pública e sem chave.'],
    ['CNPJá Open API','ready','CNPJ, CNAE e QSA','Ativa como fonte pública alternativa para consulta cadastral.'],
    ['Banco Central SGS','ready','Índices e taxas','Ativa no navegador para séries públicas já utilizadas pela Central.'],
    ['IBGE Localidades','study','Municípios e códigos IBGE','Planejada exclusivamente pela API pública acessível no navegador.'],
    ['SIDRA IBGE','study','Indicadores regionais','Planejada com tabelas e períodos públicos previamente definidos.'],
    ['ViaCEP','study','Endereços por CEP','Planejada como alternativa pública, sem chave e compatível com o navegador.']
  ];

  const paragraph = (text='') => ({id:uid(),type:'paragraph',text});
  const section = (text='Nova seção') => ({id:uid(),type:'section',text});
  const list = style => ({id:uid(),type:'list',style,numbering:'decimal',numberingFlow:'restart',bullet:'•',items:[{text:'Novo item',level:0,checked:false}]});
  const table = () => ({id:uid(),type:'table',header:true,rowTotals:true,columns:[{label:'Descrição',type:'text'},{label:'Valor',type:'currency'}],rows:[['','0,00']]});

  function baseMeta() {
    let session={};
    try { session=JSON.parse(sessionStorage.getItem('centralFcoSessionV1')||'{}'); } catch (_) {}
    return {number:'',sector:session.agencia?.prefixo?`Agência ${session.agencia.prefixo}`:'',agencyName:session.agencia?.nome||'',location:session.agencia?.municipio?`${session.agencia.municipio}-${session.agencia.uf||''}`:'',date:new Date().toISOString().slice(0,10),recipient:'',subject:'',signer:session.acesso?.nome||'',role:'',seller:{cnpj:'',legalName:'',tradeName:'',address:'',source:''},client:{cnpj:'',legalName:'',tradeName:'',source:''},creditInstrument:'CÉDULA DE CRÉDITO',creditInstrumentNumber:''};
  }
  function address(company) { return company?.fullAddress || [company?.address?.street,company?.address?.number,company?.address?.district,[company?.address?.city,company?.address?.state].filter(Boolean).join('-'),company?.address?.zip].filter(Boolean).join(', '); }
  function cnpj(value) { return String(value||'').replace(/\D/g,'').replace(/^(\d{2})(\d)/,'$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d)/,'.$1/$2').replace(/(\/\d{4})(\d)/,'$1-$2').slice(0,18); }
  function authorizationIntro(meta) {
    const client=meta.client||{};
    const instrument=meta.creditInstrument||'CÉDULA DE CRÉDITO';
    const article=instrument.startsWith('CÉDULA')?'da':'do';
    return `Autorizamos proceder o faturamento do bem abaixo discriminado, objeto ${article} ${instrument} ${meta.creditInstrumentNumber||'{Nº DA CÉDULA}'}, firmado entre o BANCO DO BRASIL S.A. e ${client.legalName||'{RAZÃO SOCIAL DO CLIENTE}'}, CNPJ: ${client.cnpj||'{Nº DO CNPJ}'}.`;
  }
  function authorizationInstructions(meta) {
    return `A nota fiscal deverá consignar, OBRIGATORIAMENTE, além dos requisitos legais, as informações: denominação social ou sigla do fabricante, e, no campo “dados adicionais/informações complementares”, os dados referentes ao ano de fabricação do bem, número de série ou identificação e modelo da máquina ou do equipamento, as suas características e os elementos que o constituem, o nº da cédula CCB ${meta.creditInstrumentNumber||'{Nº DA CÉDULA}'} do agente financeiro e a condição de que “o Banco do Brasil S.A. é o PROPRIETÁRIO FIDUCIÁRIO ou BENEFICIÁRIO DO PENHOR, conforme o caso, do bem discriminado nesta nota fiscal ou DANFE.” Esclarecemos que a ausência dessas informações no campo dados adicionais/informações complementares da nota fiscal poderá ocasionar a não liberação de recursos.`;
  }
  function authorizationParagraph(text,role) { return {id:uid(),type:'paragraph',text,role}; }
  function preset(templateName) {
    const meta=baseMeta();
    if (templateName==='autorizacao_faturamento') {
      const company=window.CentralData?.getCurrent?.();
      if(company)meta.client={cnpj:cnpj(company.cnpj),legalName:company.legalName||'',tradeName:company.tradeName||'',source:company.source||'Cadastro compartilhado'};
      meta.subject='Autorização de faturamento';
      return {template:templateName,meta,authorizationVersion:2,blocks:[authorizationParagraph(authorizationIntro(meta),'authorization-intro'),{id:uid(),type:'table',header:true,rowTotals:false,columns:[{label:'Qtd.',type:'number'},{label:'Identificação do bem',type:'text'},{label:'Valor orçado',type:'currency'},{label:'Valor financiado',type:'currency'},{label:'Recursos próprios',type:'currency'}],rows:[['1','Descrição do bem','0,00','0,00','0,00']]},authorizationParagraph(authorizationInstructions(meta),'authorization-instructions')],dirty:false};
    }
    const text={oficio:'Cumprimentando-o cordialmente, encaminhamos as informações a seguir para conhecimento e providências.',memorando:'Apresentamos, para ciência e encaminhamento interno, o assunto descrito neste documento.',parecer:'Este parecer examina os elementos apresentados e registra a análise técnica correspondente.',relatorio:'Este relatório apresenta o objetivo, os dados considerados e os resultados da análise.',portaria:'Estabelece as disposições e responsabilidades descritas a seguir.'}[templateName]||'';
    return {template:templateName,meta,blocks:[paragraph(text)],dirty:false};
  }
  function load() { try { const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'); if([1,2].includes(saved?.version)&&Array.isArray(saved.document?.blocks)){saved.document.dirty=saved.document.dirty??saved.document.blocks.length>1;return saved.document;} } catch (_) {} return preset('oficio'); }
  let state=load();
  state.meta.seller ||= {cnpj:'',legalName:'',tradeName:'',address:'',source:''};
  state.meta.client ||= {cnpj:'',legalName:'',tradeName:'',source:''};
  state.meta.creditInstrument ||= 'CÉDULA DE CRÉDITO';
  state.meta.creditInstrumentNumber ||= '';
  state.meta.agencyName ||= '';
  state.blocks.forEach(block=>{if(block.type==='list')block.numberingFlow||='restart';});
  function refreshAuthorizationContent() {
    if(state.template!=='autorizacao_faturamento')return;
    const standardized=state.blocks.filter(block=>block.type!=='paragraph'||!block.role&&!/^(Autorizamos proceder|A nota fiscal deverá|A ausência das informações|Atenciosamente)/i.test(block.text.trim()));
    const tableBlock=state.blocks.find(block=>block.type==='table')||{id:uid(),type:'table',header:true,rowTotals:false,columns:[{label:'Qtd.',type:'number'},{label:'Identificação do bem',type:'text'},{label:'Valor orçado',type:'currency'},{label:'Valor financiado',type:'currency'},{label:'Recursos próprios',type:'currency'}],rows:[['1','Descrição do bem','0,00','0,00','0,00']]};
    const extras=standardized.filter(block=>block!==tableBlock&&block.role!=='authorization-intro'&&block.role!=='authorization-instructions');
    const intro=state.blocks.find(block=>block.role==='authorization-intro')||authorizationParagraph('','authorization-intro');
    const instructions=state.blocks.find(block=>block.role==='authorization-instructions')||authorizationParagraph('','authorization-instructions');
    intro.text=authorizationIntro(state.meta);instructions.text=authorizationInstructions(state.meta);
    state.blocks=[intro,tableBlock,instructions,...extras];
    state.authorizationVersion=2;
  }
  refreshAuthorizationContent();
  let priorTemplate=state.template;
  let saveTimer;
  function save() { clearTimeout(saveTimer); $('#draftStatus').textContent='Salvando…'; saveTimer=setTimeout(()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify({version:2,updatedAt:new Date().toISOString(),document:state}));$('#draftStatus').textContent='Rascunho salvo neste navegador';}catch(_){$('#draftStatus').textContent='Rascunho em memória';}},180); }
  function blockName(block) { return block.type==='paragraph'?'Parágrafo':block.type==='section'?'Seção':block.type==='table'?'Tabela':block.style==='numbered'?'Lista numerada':block.style==='check'?'Checklist':'Lista com marcadores'; }

  function listEditor(block) {
    const option=block.style==='numbered'?`<div class="list-settings"><label>Numeração <select data-block="${block.id}" data-prop="numbering"><option value="decimal">1, 2, 3</option><option value="hierarchical"${block.numbering==='hierarchical'?' selected':''}>1.1 hierárquica</option><option value="roman"${block.numbering==='roman'?' selected':''}>I, II, III</option><option value="alpha"${block.numbering==='alpha'?' selected':''}>a), b), c)</option></select></label><label>Sequência <select data-block="${block.id}" data-prop="numberingFlow"><option value="restart">Reiniciar nesta lista</option><option value="continue"${block.numberingFlow==='continue'?' selected':''}>Continuar lista anterior</option></select></label></div>`:block.style==='bullet'?`<label>Marcador <select data-block="${block.id}" data-prop="bullet">${['•','–','○','▪','→'].map(mark=>`<option${block.bullet===mark?' selected':''}>${mark}</option>`).join('')}</select></label>`:'';
    const counters=[0,0,0,0,0];
    const items=block.items.map((item,index)=>`<div class="list-item-editor">${block.style==='check'?`<input type="checkbox" data-block="${block.id}" data-item="${index}" data-item-prop="checked"${item.checked?' checked':''}>`:`<span>${esc(block.style==='bullet'?block.bullet:marker(block,index,counters))}</span>`}<input data-block="${block.id}" data-item="${index}" data-item-prop="text" value="${esc(item.text)}"><div><button class="block-action" type="button" data-level="-1" data-block="${block.id}" data-index="${index}">←</button><button class="block-action" type="button" data-level="1" data-block="${block.id}" data-index="${index}">→</button><button class="block-action" type="button" data-remove-item data-block="${block.id}" data-index="${index}">×</button></div></div>`).join('');
    return `${option}<div class="table-config">${items}</div><button class="block-action" type="button" data-add-item data-block="${block.id}">+ Adicionar item</button>`;
  }
  function tableEditor(block) {
    const options=`<div class="block-options"><label><input type="checkbox" data-block="${block.id}" data-prop="header"${block.header?' checked':''}> Cabeçalho</label><label><input type="checkbox" data-block="${block.id}" data-prop="rowTotals"${block.rowTotals?' checked':''}> Somar por linha</label></div>`;
    const columns=block.columns.map((column,index)=>`<div class="editor-block__row editor-block__row--table"><input data-block="${block.id}" data-col="${index}" data-col-prop="label" value="${esc(column.label)}"><select data-block="${block.id}" data-col="${index}" data-col-prop="type"><option value="text"${column.type==='text'?' selected':''}>Texto</option><option value="number"${column.type==='number'?' selected':''}>Número</option><option value="currency"${column.type==='currency'?' selected':''}>Moeda</option><option value="date"${column.type==='date'?' selected':''}>Data</option></select><button class="block-action" type="button" data-remove-column data-block="${block.id}" data-index="${index}">×</button></div>`).join('');
    const rows=block.rows.map((row,rowIndex)=>`<div class="table-row-editor" style="--columns:${block.columns.length}">${block.columns.map((_,colIndex)=>`<input data-block="${block.id}" data-row="${rowIndex}" data-cell="${colIndex}" value="${esc(row[colIndex]||'')}">`).join('')}<button class="block-action" type="button" data-remove-row data-block="${block.id}" data-index="${rowIndex}">×</button></div>`).join('');
    return `${options}<div class="table-config">${columns}</div><div class="table-config">${rows}</div><div><button class="block-action" type="button" data-add-row data-block="${block.id}">+ Linha</button> <button class="block-action" type="button" data-add-column data-block="${block.id}">+ Coluna</button></div>`;
  }
  const metaMap={documentNumber:'number',documentSector:'sector',documentLocation:'location',documentDate:'date',documentRecipient:'recipient',documentSubject:'subject',documentSigner:'signer',documentRole:'role'};
  function renderEditor() {
    $('#writingTemplate').value=state.template;
    Object.entries(metaMap).forEach(([element,key])=>{$(`#${element}`).value=state.meta[key]||'';});
    $('#blockList').innerHTML=state.blocks.map((block,index)=>`<article class="editor-block" data-editor-id="${block.id}"><header class="editor-block__head"><strong>${index+1}. ${blockName(block)}</strong><button type="button" data-move="-1" data-block="${block.id}">↑</button><button type="button" data-move="1" data-block="${block.id}">↓</button><button type="button" data-remove data-block="${block.id}">×</button></header><div class="editor-block__body">${block.type==='paragraph'||block.type==='section'?`<textarea data-block="${block.id}" data-prop="text">${esc(block.text)}</textarea>`:block.type==='list'?listEditor(block):tableEditor(block)}</div></article>`).join('');
    $('#emptyBlocks').hidden=state.blocks.length>0;
    const seller=state.meta.seller||{};
    $('#sellerPanel').hidden=state.template!=='autorizacao_faturamento';
    $('#recipientField').hidden=state.template==='autorizacao_faturamento';
    $('#sellerCnpj').value=seller.cnpj||'';
    $('#sellerName').value=seller.legalName||'';
    $('#sellerTradeName').value=seller.tradeName||'';
    $('#sellerAddress').value=seller.address||'';
    const client=state.meta.client||{};
    $('#authorizationPanel').hidden=state.template!=='autorizacao_faturamento';
    $('#clientCnpj').value=client.cnpj||'';
    $('#clientName').value=client.legalName||'';
    $('#clientTradeName').value=client.tradeName||'';
    $('#creditInstrument').value=state.meta.creditInstrument||'CÉDULA DE CRÉDITO';
    $('#creditInstrumentNumber').value=state.meta.creditInstrumentNumber||'';
  }
  function number(value) {
    const raw=String(value||'').trim().replace(/R\$\s?/g,'').replace(/\s/g,'');
    const parsed=Number(raw.includes(',')?raw.replace(/\./g,'').replace(',','.'):raw);
    return Number.isFinite(parsed)?parsed:0;
  }
  const format=(value,type)=>type==='currency'?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value):new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(value);
  function roman(value) { const map=[[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']]; let output=''; for(const [amount,symbol] of map){while(value>=amount){output+=symbol;value-=amount;}} return output; }
  function marker(block,index,counters) {
    const level=Math.max(0,Math.min(4,Number(block.items[index].level)||0));
    counters[level]=(counters[level]||0)+1;counters.fill(0,level+1);
    if(block.numbering==='hierarchical') return `${counters.slice(0,level+1).map(value=>value||1).join('.')}.`;
    if(block.numbering==='roman') return `${roman(counters[level])}.`;
    if(block.numbering==='alpha') return `${String.fromCharCode(96+Math.min(counters[level],26))})`;
    return `${counters[level]}.`;
  }
  function blockHtml(block,context={numbered:{}}) {
    if(block.type==='paragraph') return `<p>${esc(block.text).replace(/\n/g,'<br>')}</p>`;
    if(block.type==='section') return `<h2>${esc(block.text)}</h2>`;
    if(block.type==='list') {
      const counters=block.style==='numbered'&&block.numberingFlow==='continue'&&context.numbered[block.numbering]?[...context.numbered[block.numbering]]:[0,0,0,0,0];
      const html=`<div class="paper-list">${block.items.map((item,index)=>{const prefix=block.style==='check'?(item.checked?'☑':'☐'):block.style==='bullet'?block.bullet:marker(block,index,counters);return `<div class="paper-list__item" style="--level:${Math.max(0,Math.min(4,Number(item.level)||0))}"><span>${esc(prefix)}</span><p>${esc(item.text)}</p></div>`;}).join('')}</div>`;
      if(block.style==='numbered')context.numbered[block.numbering]=[...counters];
      return html;
    }
    const numeric=block.columns.map((column,index)=>['number','currency'].includes(column.type)?index:-1).filter(index=>index>=0);
    const rowTotals=block.rowTotals&&numeric.length>1;
    const head=block.header?`<thead><tr>${block.columns.map(column=>`<th class="${['number','currency'].includes(column.type)?'is-number':''}">${esc(column.label)}</th>`).join('')}${rowTotals?'<th class="is-number">Total da linha</th>':''}</tr></thead>`:'';
    const body=block.rows.map(row=>`<tr>${block.columns.map((column,index)=>`<td class="${['number','currency'].includes(column.type)?'is-number':''}">${esc(column.type==='currency'?format(number(row[index]),'currency'):row[index]||'')}</td>`).join('')}${rowTotals?`<td class="is-number">${format(numeric.reduce((sum,index)=>sum+number(row[index]),0),'currency')}</td>`:''}</tr>`).join('');
    const foot=numeric.length?`<tfoot><tr>${block.columns.map((column,index)=>numeric.includes(index)?`<td class="is-number">${format(block.rows.reduce((sum,row)=>sum+number(row[index]),0),column.type)}</td>`:`<th>${index===0?'Total':''}</th>`).join('')}${rowTotals?`<td class="is-number">${format(block.rows.reduce((total,row)=>total+numeric.reduce((sum,index)=>sum+number(row[index]),0),0),'currency')}</td>`:''}</tr></tfoot>`:'';
    return `<table>${head}<tbody>${body}</tbody>${foot}</table>`;
  }
  function blocksHtml(){const context={numbered:{}};return state.blocks.map(block=>blockHtml(block,context)).join('');}
  function dateText() { return state.meta.date?new Intl.DateTimeFormat('pt-BR',{dateStyle:'long',timeZone:'UTC'}).format(new Date(`${state.meta.date}T12:00:00Z`)):''; }
  function previewInner(absoluteLogo=false) {
    const recipient=state.meta.recipient?`<p><strong>À</strong><br>${esc(state.meta.recipient).replace(/ · /g,'<br>')}</p>`:'';
    const subject=state.meta.subject?`<p class="paper-subject">Assunto: ${esc(state.meta.subject)}</p>`:'';
    const placeDate=[state.meta.location,dateText()].filter(Boolean).join(', ');
    const logo=absoluteLogo?new URL('logo02.png',location.href).href:'logo02.png';
    const support=window.CentralDocuments.supportFooter('writing-support-footer').replace(/^<footer[^>]*>/,'').replace(/<\/footer>$/,'');
    const header=`<header class="paper-header"><img src="${esc(logo)}" alt="Banco do Brasil"><div><span>CENTRAL EMPRESAS · ${esc(state.meta.sector||'DOCUMENTO OFICIAL')}</span><strong>${labels[state.template]}${state.meta.number?` Nº ${esc(state.meta.number)}`:''}</strong></div></header>`;
    const footer=`<footer class="paper-footer">${support}</footer>`;
    if(state.template==='autorizacao_faturamento'){
      const agency=[state.meta.sector?.replace(/^Agência\s*/i,''),state.meta.agencyName].filter(Boolean).join(' - ');
      const closing=`<section class="authorization-closing"><p>${esc(placeDate)}</p><p>Atenciosamente,</p><div class="authorization-bank"><strong>Banco do Brasil S.A.</strong>${agency?`<span>Agência ${esc(agency)}</span>`:''}</div>${state.meta.signer?`<div class="paper-signature"><strong>${esc(state.meta.signer)}</strong><span>${esc(state.meta.role||'Gerente de Relacionamento')}</span></div>`:''}</section>`;
      return `${header}<section class="paper-meta paper-meta--authorization">${recipient}</section><p class="paper-reference">REF.: AUTORIZAÇÃO DE FATURAMENTO</p><main class="paper-content">${blocksHtml()}</main>${closing}${footer}`;
    }
    return `${header}<section class="paper-meta">${recipient}<p>${esc(placeDate)}</p>${subject}</section><main class="paper-content">${blocksHtml()}</main>${state.meta.signer?`<section class="paper-signature"><strong>${esc(state.meta.signer)}</strong><span>${esc(state.meta.role||state.meta.sector)}</span></section>`:''}${footer}`;
  }
  function renderPreview(){ const preview=$('#documentPreview');preview.classList.toggle('writing-paper--authorization',state.template==='autorizacao_faturamento');preview.innerHTML=previewInner(); }
  function update(editor=false){save();if(editor)renderEditor();renderPreview();}
  function find(blockId){return state.blocks.find(block=>block.id===blockId);}
  function syncSellerRecipient(){
    const seller=state.meta.seller||{};
    state.meta.recipient=[seller.legalName,seller.tradeName,seller.cnpj?`CNPJ: ${seller.cnpj}`:'',seller.address].filter(Boolean).join(' · ');
  }
  function updateAuthorizationFields(){
    refreshAuthorizationContent();
    state.blocks.filter(block=>block.role).forEach(block=>{const input=document.querySelector(`[data-block="${block.id}"][data-prop="text"]`);if(input)input.value=block.text;});
    state.dirty=true;renderPreview();save();
  }

  document.querySelectorAll('[data-add-block]').forEach(button=>button.addEventListener('click',()=>{
    const type=button.dataset.addBlock;
    state.blocks.push(type==='paragraph'?paragraph():type==='section'?section():type==='table'?table():list(type==='numbered-list'?'numbered':type==='bullet-list'?'bullet':'check'));
    state.dirty=true;update(true);
    document.querySelector(`[data-editor-id="${state.blocks.at(-1).id}"]`)?.scrollIntoView({behavior:'smooth',block:'nearest'});
  }));
  Object.entries(metaMap).forEach(([element,key])=>$(`#${element}`).addEventListener('input',event=>{state.meta[key]=event.target.value;state.dirty=true;update();}));
  $('#writingTemplate').addEventListener('change',event=>{
    const next=event.target.value;
    if(state.dirty&&!confirm('Trocar o modelo substituirá os blocos atuais. Deseja continuar?')){event.target.value=priorTemplate;return;}
    state=preset(next);priorTemplate=next;update(true);
  });
  $('#blockList').addEventListener('input',event=>{
    const target=event.target,block=find(target.dataset.block);if(!block)return;
    if(target.dataset.item!==undefined)block.items[Number(target.dataset.item)][target.dataset.itemProp]=target.type==='checkbox'?target.checked:target.value;
    else if(target.dataset.col!==undefined)block.columns[Number(target.dataset.col)][target.dataset.colProp]=target.value;
    else if(target.dataset.row!==undefined)block.rows[Number(target.dataset.row)][Number(target.dataset.cell)]=target.value;
    else if(target.dataset.prop)block[target.dataset.prop]=target.type==='checkbox'?target.checked:target.value;
    state.dirty=true;update();
  });
  $('#blockList').addEventListener('keydown',event=>{
    const target=event.target;
    if(target.dataset.item===undefined||target.dataset.itemProp!=='text'||!['Enter','Tab'].includes(event.key))return;
    const block=find(target.dataset.block);
    if(!block||block.type!=='list')return;
    event.preventDefault();
    const index=Number(target.dataset.item);
    let focusIndex=index;
    if(event.key==='Enter'){
      block.items.splice(index+1,0,{text:'',level:Number(block.items[index].level)||0,checked:false});
      focusIndex=index+1;
    }else{
      const direction=event.shiftKey?-1:1;
      block.items[index].level=Math.max(0,Math.min(4,(Number(block.items[index].level)||0)+direction));
    }
    state.dirty=true;update(true);
    requestAnimationFrame(()=>document.querySelector(`[data-block="${block.id}"][data-item="${focusIndex}"][data-item-prop="text"]`)?.focus());
  });
  $('#blockList').addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    const block=find(button.dataset.block);if(!block)return;
    const blockIndex=state.blocks.indexOf(block);
    if(button.hasAttribute('data-remove'))state.blocks.splice(blockIndex,1);
    else if(button.dataset.move){const next=blockIndex+Number(button.dataset.move);if(next>=0&&next<state.blocks.length)[state.blocks[blockIndex],state.blocks[next]]=[state.blocks[next],state.blocks[blockIndex]];}
    else if(button.hasAttribute('data-add-item'))block.items.push({text:'Novo item',level:0,checked:false});
    else if(button.hasAttribute('data-remove-item'))block.items.splice(Number(button.dataset.index),1);
    else if(button.dataset.level){const item=block.items[Number(button.dataset.index)];item.level=Math.max(0,Math.min(4,(Number(item.level)||0)+Number(button.dataset.level)));}
    else if(button.hasAttribute('data-add-row'))block.rows.push(block.columns.map(()=>''));
    else if(button.hasAttribute('data-remove-row'))block.rows.splice(Number(button.dataset.index),1);
    else if(button.hasAttribute('data-add-column')){block.columns.push({label:`Coluna ${block.columns.length+1}`,type:'text'});block.rows.forEach(row=>row.push(''));}
    else if(button.hasAttribute('data-remove-column')&&block.columns.length>1){const column=Number(button.dataset.index);block.columns.splice(column,1);block.rows.forEach(row=>row.splice(column,1));}
    state.dirty=true;update(true);
  });
  $('#clearDraft').addEventListener('click',()=>{if(!confirm('Deseja apagar o rascunho atual e começar novamente?'))return;localStorage.removeItem(STORAGE_KEY);state=preset(state.template);priorTemplate=state.template;update(true);});
  $('#sellerCnpj').addEventListener('input',event=>{event.target.value=event.target.value.toUpperCase().replace(/[^A-Z0-9./-]/g,'').slice(0,18);});
  $('#clientCnpj').addEventListener('input',event=>{event.target.value=cnpj(event.target.value);});
  $('#creditInstrument').addEventListener('change',event=>{state.meta.creditInstrument=event.target.value;updateAuthorizationFields();});
  $('#creditInstrumentNumber').addEventListener('input',event=>{state.meta.creditInstrumentNumber=event.target.value;updateAuthorizationFields();});
  $('#sellerAddress').addEventListener('input',event=>{state.meta.seller.address=event.target.value;syncSellerRecipient();state.dirty=true;update();});
  $('#sellerLookup').addEventListener('click',async()=>{
    const document=$('#sellerCnpj').value.toUpperCase().replace(/[^A-Z0-9]/g,'');
    const message=$('#sellerMessage');
    if(document.length!==14){message.className='inline-message is-error';message.textContent='Informe um CNPJ com 14 posições.';return;}
    $('#sellerLookup').disabled=true;message.className='inline-message';message.textContent='Consultando o vendedor…';
    try{
      const raw=await window.CnpjApi.request(document,{remember:false});
      const company=window.CentralData.normalizeCompany(raw,{source:raw.fonte_consulta||'Consulta cadastral'});
      state.meta.seller={cnpj:cnpj(company.cnpj),legalName:company.legalName,tradeName:company.tradeName,address:address(company),source:company.source};
      syncSellerRecipient();state.dirty=true;renderEditor();renderPreview();save();
      message.className='inline-message is-success';message.textContent=`Vendedor localizado em ${company.source}. Confira o endereço antes de gerar.`;
    }catch(error){message.className='inline-message is-error';message.textContent=error.message||'Não foi possível consultar o vendedor.';}
    finally{$('#sellerLookup').disabled=false;}
  });
  $('#clientLookup').addEventListener('click',async()=>{
    const document=$('#clientCnpj').value.replace(/\D/g,'');
    const message=$('#clientMessage');
    if(document.length!==14){message.className='inline-message is-error';message.textContent='Informe um CNPJ com 14 dígitos.';return;}
    $('#clientLookup').disabled=true;message.className='inline-message';message.textContent='Consultando o cliente…';
    try{
      const raw=await window.CnpjApi.request(document);
      const company=window.CentralData.normalizeCompany(raw,{source:raw.fonte_consulta||'Consulta cadastral'});
      state.meta.client={cnpj:cnpj(company.cnpj),legalName:company.legalName,tradeName:company.tradeName,source:company.source};
      refreshAuthorizationContent();state.dirty=true;renderEditor();renderPreview();save();
      message.className='inline-message is-success';message.textContent=`Cliente localizado em ${company.source}. Os dados foram aplicados ao documento.`;
    }catch(error){message.className='inline-message is-error';message.textContent=error.message||'Não foi possível consultar o cliente.';}
    finally{$('#clientLookup').disabled=false;}
  });

  function printableHtml(){
    const font=window.CentralDocuments.fontCss(location.href);
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc(labels[state.template])}</title><style>
${font}
*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
@page{size:A4;margin:0}
html,body{width:210mm;min-height:297mm;margin:0;background:#fff;color:#111;font-family:"BB Textos",Arial,sans-serif}
.writing-paper{position:relative;width:210mm;min-height:297mm;display:flex;flex-direction:column;padding:13mm 18mm 27mm}
.paper-header{display:grid;grid-template-columns:46px 1fr;align-items:center;gap:12px;padding-bottom:6mm;border-bottom:.8pt solid #29298f}
.paper-header img{width:43px}.paper-header span,.paper-header strong{display:block}.paper-header span{font-size:8pt;letter-spacing:.1em}.paper-header strong{font-family:"BB Títulos";font-size:13pt}
.paper-meta{display:grid;grid-template-columns:1fr auto;gap:6px;margin:7mm 0 5mm;font-size:9.5pt}.paper-meta p{margin:0}.paper-meta--authorization{display:block;margin-bottom:4mm}.paper-subject{grid-column:1/-1;padding-top:3mm;font-weight:700}.paper-reference{margin:0 0 5mm;font-size:9.5pt;font-weight:700}
.paper-content{font-size:10.5pt;line-height:1.5}.paper-content p{margin:0 0 4mm;text-align:justify}.paper-content h2{margin:7mm 0 3mm;font-family:"BB Títulos";font-size:12pt;break-after:avoid}.paper-list{margin:0 0 4mm}.paper-list__item{display:grid;grid-template-columns:7mm 1fr;gap:2mm;margin:1.2mm 0 1.2mm calc(var(--level)*7mm);break-inside:avoid}.paper-list__item p{margin:0;text-align:left}
.paper-content table{width:100%;margin:4mm 0;border-collapse:collapse;font-size:8.5pt}.paper-content tr{break-inside:avoid}.paper-content th,.paper-content td{padding:2.2mm;border:1px solid #cfd0d5}.paper-content th{background:#29298f!important;color:#fff!important;text-align:left}.is-number{text-align:right!important}.paper-content tfoot th,.paper-content tfoot td{background:#eef0ff!important;color:#202072!important;font-weight:700}
.authorization-closing{font-size:9.5pt;line-height:1.45;break-inside:avoid}.authorization-closing>p{margin:0 0 4mm}.authorization-bank strong,.authorization-bank span{display:block}.paper-signature{width:75mm;margin:12mm auto 0;text-align:center;font-size:9.5pt;break-inside:avoid}.paper-signature:before{content:"";display:block;margin-bottom:2mm;border-top:1px solid #222}.paper-signature strong,.paper-signature span{display:block}
.paper-footer{position:absolute;left:18mm;right:18mm;bottom:10mm;padding-top:2.5mm;border-top:.6pt solid #aaa;color:#333;font-size:7.5pt;line-height:1.25;text-align:left}.writing-support-footer .document-trace{display:block;margin-top:1mm;color:#555}
@media print{html,body{width:210mm;height:297mm}.writing-paper{break-after:page}}
</style></head><body><article class="writing-paper">${previewInner(true)}</article></body></html>`;
  }
  $('#openDocument').addEventListener('click',()=>{
    if(state.template==='autorizacao_faturamento'){
      const missing=[];
      if(!state.meta.seller?.cnpj)missing.push('CNPJ do vendedor');
      if(!state.meta.client?.cnpj)missing.push('CNPJ do cliente');
      if(!state.meta.creditInstrumentNumber?.trim())missing.push('número da cédula');
      if(missing.length){$('#draftStatus').textContent=`Preencha antes de abrir: ${missing.join(', ')}`;return;}
    }
    const viewer=window.CentralDocuments.openViewer();if(!viewer){$('#draftStatus').textContent='Permita a abertura da janela para visualizar o documento';return;}viewer.deliver(printableHtml());
  });
  $('#integrationGrid').innerHTML=integrations.map(([name,status,use,note])=>`<article class="integration-card"><div class="integration-card__head"><h3>${esc(name)}</h3><i class="status-dot status-dot--${status}"></i></div><p>${esc(note)}</p><small>Uso possível</small><strong>${esc(use)}</strong></article>`).join('');

  renderEditor();renderPreview();save();
})();
