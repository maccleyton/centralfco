(function () {
  'use strict';
  const catalog = window.CentralCreditCatalog;
  const eligibility = window.CentralCreditEligibility;
  const engine = window.CentralFinancialEngine;
  const rules = window.CentralCreditRules;
  const currency = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  const escapeHtml = value => String(value ?? '').replace(/[&<>"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
  const parseNumber = value => Number(String(value).trim().replace(/\./g,'').replace(',','.'));
  let selectedId = catalog.lines[0].id;
  let selicAnnual=null;
  let scenarioSequence=2;
  let scenarios=[
    {id:1,lineId:'pronampe-atual',system:'sac',monthlyRate:'',fee:'0',installments:'48',graceMonths:'6',autoRate:true},
    {id:2,lineId:'bndes-digital',system:'price',monthlyRate:'',fee:'0',installments:'24',graceMonths:'0',autoRate:true}
  ];
  let simulationRuns=[];
  let selectedRun=0;
  let lastScreening=[];

  document.getElementById('catalogCount').textContent = catalog.lines.length;
  document.getElementById('catalogVersion').textContent = `Versão ${catalog.CATALOG_VERSION}`;
  const family = document.getElementById('creditFamily');
  [...new Set(catalog.lines.map(line=>line.family))].sort().forEach(value=>family.add(new Option(value,value)));

  function statusLabel(status) { return ({informative:'Catálogo',process:'Orientação de processo',external_parameters:'Parâmetros externos',historical:'Histórico'})[status] || status; }
  function filtered() {
    const query = document.getElementById('creditSearch').value.trim().toLocaleLowerCase('pt-BR');
    return catalog.lines.filter(line => (!family.value || line.family===family.value) && (!query || [line.name,line.audience,line.purpose,line.family].join(' ').toLocaleLowerCase('pt-BR').includes(query)));
  }
  function renderList() {
    const lines = filtered();
    document.getElementById('creditList').innerHTML = lines.length ? lines.map(line=>`<button class="credit-item" type="button" data-id="${line.id}" aria-current="${line.id===selectedId}"><strong>${escapeHtml(line.name)}</strong><span>${escapeHtml(line.family)} · ${escapeHtml(statusLabel(line.status))}</span></button>`).join('') : '<p>Nenhuma linha encontrada.</p>';
    document.querySelectorAll('.credit-item').forEach(button=>button.addEventListener('click',()=>{selectedId=button.dataset.id;renderList();renderDetail();}));
  }
  function renderDetail() {
    const line = catalog.getById(selectedId) || filtered()[0];
    if (!line) { document.getElementById('creditDetail').innerHTML='<p>Selecione outra combinação de filtros.</p>'; return; }
    selectedId=line.id;
    document.getElementById('creditDetail').innerHTML=`<span class="credit-tag">${escapeHtml(line.family)} · ${escapeHtml(statusLabel(line.status))}</span><h2>${escapeHtml(line.name)}</h2><p><strong>Finalidade:</strong> ${escapeHtml(line.purpose)}</p><p><strong>Público de referência:</strong> ${escapeHtml(line.audience)}</p><h3>Condições documentadas</h3><ul>${line.terms.map(term=>`<li>${escapeHtml(term)}</li>`).join('')}</ul><h3>Fonte e rastreabilidade</h3>${line.sources.map(item=>{const source=catalog.getSource(item.file)||{};const confidence={medium:'confiança média',limited:'confiança limitada'}[source.confidence]||'não classificada';return `<p class="credit-source"><strong>${escapeHtml(item.file)}</strong> · ${escapeHtml(item.pages)} · ${escapeHtml(confidence)}<br>${escapeHtml(item.note)}</p>`;}).join('')}<p class="credit-source">Revisão das fontes: ${escapeHtml(catalog.SOURCE_REVIEW_DATE)} · catálogo ${escapeHtml(catalog.CATALOG_VERSION)}</p><section class="eligibility-box"><strong>Triagem preliminar</strong>${line.rules.some(rule=>rule.field==='annualRevenue')?'<label>Faturamento/receita anual (R$)<input id="eligibilityRevenue" inputmode="decimal"></label>':''}<button id="eligibilityCheck" class="button button--secondary" type="button">Verificar critérios locais</button><span id="eligibilityResult" class="eligibility-result"></span></section><div class="simulation-warning"><strong>Simulação financeira indisponível</strong><br>${escapeHtml(engine.simulateLine(line).reason)}</div>`;
    document.getElementById('eligibilityCheck').addEventListener('click',()=>{
      const field=document.getElementById('eligibilityRevenue');
      const result=eligibility.evaluate(line,field&&field.value.trim()?{annualRevenue:parseNumber(field.value)}:{});
      const label={ineligible:'Não enquadrado pelos critérios informados.',needs_review:'Necessita conferência.',preliminarily_eligible:'Pré-enquadramento atendido.'}[result.status];
      document.getElementById('eligibilityResult').textContent=`${label} ${result.reasons.join(' ')}`;
    });
  }
  document.getElementById('creditSearch').addEventListener('input',()=>{renderList();renderDetail();});
  family.addEventListener('change',()=>{renderList();renderDetail();});

  function lineOptions(selected){return catalog.lines.map(line=>`<option value="${escapeHtml(line.id)}"${line.id===selected?' selected':''}>${escapeHtml(line.name)}</option>`).join('');}
  function screeningInput(overrides={}){
    const established=document.getElementById('simulationEstablished').value;
    const clientRisk=document.getElementById('simulationClientRisk').value;
    const operationRisk=document.getElementById('simulationOperationRisk').value;
    const riskKnown=clientRisk!=='unknown'&&operationRisk!=='unknown';
    return {
      principal:parseNumber(document.getElementById('simulationPrincipal').value),
      annualRevenue:parseNumber(document.getElementById('simulationRevenue').value),
      installments:Number(document.getElementById('simulationTerm').value),
      graceMonths:Number(document.getElementById('simulationGrace').value),
      purpose:document.getElementById('simulationPurpose').value,
      ruralActivity:document.getElementById('simulationActivity').value==='rural',
      womenLeadership:document.getElementById('simulationWomen').checked,
      companyEstablishedBy2024:established?(established<='2024-12'?'yes':'no'):'unknown',
      dicreEnabled:document.getElementById('simulationDicre').value,
      fgiAvailable:document.getElementById('simulationFgi').value,
      fiesEligible:document.getElementById('simulationFies').value,
      bndesRisk:riskKnown&&['A','B','C'].includes(clientRisk)&&['AA','A','B'].includes(operationRisk)?'yes':riskKnown?'no':'unknown',
      ...overrides
    };
  }
  function formattedRate(rate){return rate?.monthly.toLocaleString('pt-BR',{minimumFractionDigits:4,maximumFractionDigits:4})||'';}
  function makeScenario(lineId,id=++scenarioSequence){
    const profile=rules.getProfile(lineId),suggestion=rules.suggestedRate(profile,selicAnnual);
    const desiredTerm=document.getElementById('simulationTerm').value||'48';
    const desiredGrace=document.getElementById('simulationGrace').value||'0';
    return {id,lineId,system:profile?.system||'sac',monthlyRate:formattedRate(suggestion),fee:String(profile?.fee??0),installments:desiredTerm,graceMonths:desiredGrace,autoRate:Boolean(suggestion)};
  }
  function scenarioHint(scenario){
    const profile=rules.getProfile(scenario.lineId),suggestion=rules.suggestedRate(profile,selicAnnual);
    if(suggestion)return `${suggestion.label}: ${suggestion.annual.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}% a.a. → ${formattedRate(suggestion)}% a.m. equivalente.`;
    if(profile?.rate?.kind==='selic_plus')return `${profile.rate.label}: atualize a Selic oficial para sugerir a taxa mensal.`;
    if(profile?.rate?.kind==='manual_discount')return `${profile.rate.label}; informe a taxa final apresentada na contratação.`;
    return 'Taxa sem fórmula estável na fonte: informe o parâmetro vigente conferido.';
  }
  function renderScenarios(){
    document.getElementById('scenarioList').innerHTML=scenarios.map((scenario,index)=>`<article class="scenario-card" data-scenario="${scenario.id}"><label>Linha ou produto<select data-field="lineId">${lineOptions(scenario.lineId)}</select></label><label>Sistema<select data-field="system"><option value="sac"${scenario.system==='sac'?' selected':''}>SAC</option><option value="price"${scenario.system==='price'?' selected':''}>Price</option></select></label><label>Taxa estimada (% a.m.)<input data-field="monthlyRate" inputmode="decimal" value="${escapeHtml(scenario.monthlyRate)}" placeholder="Ex.: 0,85" required></label><label>Tarifas iniciais (R$)<input data-field="fee" inputmode="decimal" value="${escapeHtml(scenario.fee)}" placeholder="0,00"></label><label>Prazo (meses)<input data-field="installments" type="number" min="1" max="600" value="${escapeHtml(scenario.installments)}" required></label><label>Carência (meses)<input data-field="graceMonths" type="number" min="0" max="120" value="${escapeHtml(scenario.graceMonths)}" required></label><button class="scenario-card__remove" type="button" data-remove-scenario aria-label="Remover cenário ${index+1}"${scenarios.length===1?' disabled':''}>×</button><p class="scenario-card__hint">${escapeHtml(scenarioHint(scenario))}</p></article>`).join('');
  }
  function scenarioName(run){return catalog.getById(run.input.lineId)?.name||'Cenário';}
  const percent=value=>value===null?'—':`${value.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}%`;
  function renderSchedule(){
    const run=simulationRuns[selectedRun];if(!run)return;
    const rows=run.result.schedule.map(item=>`<tr><td>${item.month}</td><td>${item.phase==='grace'?'Carência':'Pagamento'}</td><td>${currency.format(item.openingBalance)}</td><td>${currency.format(item.interest)}</td><td>${currency.format(item.amortization)}</td><td>${currency.format(item.payment)}</td><td>${currency.format(item.closingBalance)}</td></tr>`).join('');
    document.getElementById('simulationSchedule').innerHTML=`<h3>Parcelas · ${escapeHtml(scenarioName(run))} · ${run.result.system.toUpperCase()}</h3><div class="simulation-table-wrap"><table class="schedule-table"><thead><tr><th>Mês</th><th>Fase</th><th>Saldo inicial</th><th>Juros</th><th>Amortização</th><th>Parcela</th><th>Saldo final</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    document.querySelectorAll('[data-run-index]').forEach((row,index)=>row.setAttribute('aria-current',String(index===selectedRun)));
  }
  function renderSimulationResults(){
    const bestTotal=simulationRuns.reduce((best,run,index)=>run.result.totalPaid<simulationRuns[best].result.totalPaid?index:best,0);
    const bestFlow=simulationRuns.reduce((best,run,index)=>run.result.firstPayment<simulationRuns[best].result.firstPayment?index:best,0);
    const bestAverage=simulationRuns.reduce((best,run,index)=>run.result.averagePayment<simulationRuns[best].result.averagePayment?index:best,0);
    const bestTerm=simulationRuns.reduce((best,run,index)=>run.result.totalMonths<simulationRuns[best].result.totalMonths?index:best,0);
    const bestRate=simulationRuns.reduce((best,run,index)=>run.result.monthlyRate<simulationRuns[best].result.monthlyRate?index:best,0);
    const badges=`<div class="simulation-summary"><span class="simulation-award">Menor custo total: ${escapeHtml(scenarioName(simulationRuns[bestTotal]))}</span><span class="simulation-award">Melhor primeira parcela: ${escapeHtml(scenarioName(simulationRuns[bestFlow]))}</span><span class="simulation-award">Menor parcela média: ${escapeHtml(scenarioName(simulationRuns[bestAverage]))}</span><span class="simulation-award">Menor prazo: ${escapeHtml(scenarioName(simulationRuns[bestTerm]))}</span><span class="simulation-award">Menor taxa informada: ${escapeHtml(scenarioName(simulationRuns[bestRate]))}</span></div>`;
    const reviewNotes=simulationRuns.filter(run=>run.eligibility.status==='needs_review').map(run=>`<li><strong>${escapeHtml(scenarioName(run))}:</strong> ${escapeHtml(run.eligibility.reasons.join(' '))}</li>`).join('');
    const rows=simulationRuns.map((run,index)=>`<tr data-run-index="${index}" tabindex="0" aria-current="${index===selectedRun}"><td>${escapeHtml(scenarioName(run))}<br><small>${run.result.system.toUpperCase()} · ${run.eligibility.status==='preliminarily_eligible'?'pré-enquadrada':'requer conferência'} · clique para ver as parcelas</small></td><td>${percent(run.result.monthlyRate)}</td><td>${percent(run.result.effectiveMonthlyCost)}</td><td>${currency.format(run.result.fee)}</td><td>${run.result.installments} meses</td><td>${run.result.graceMonths} meses</td><td>${currency.format(run.result.firstPayment)}</td><td>${currency.format(run.result.averagePayment)}</td><td>${currency.format(run.result.lastPayment)}</td><td>${currency.format(run.result.graceInterest)}</td><td>${currency.format(run.result.graceDisbursement)}</td><td>${run.result.totalMonths} meses</td><td>${currency.format(run.result.totalInterest)}</td><td>${currency.format(run.result.totalPaid)}</td></tr>`).join('');
    const results=document.getElementById('simulationResults');results.hidden=false;results.innerHTML=`${badges}${reviewNotes?`<div class="simulation-review"><strong>Conferências ainda necessárias</strong><ul>${reviewNotes}</ul></div>`:''}<div class="simulation-table-wrap"><table class="simulation-table"><thead><tr><th>Linha</th><th>Taxa</th><th>Custo mensal</th><th>Tarifas</th><th>Prazo</th><th>Carência</th><th>Primeira parcela</th><th>Parcela média</th><th>Última parcela</th><th>Juros na carência</th><th>Desembolso na carência</th><th>Tempo total</th><th>Juros</th><th>Total pago</th></tr></thead><tbody>${rows}</tbody></table></div><section id="simulationSchedule" class="simulation-schedule"></section>`;
    document.querySelectorAll('[data-run-index]').forEach(row=>{const select=()=>{selectedRun=Number(row.dataset.runIndex);renderSchedule();};row.addEventListener('click',select);row.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select();}});});
    renderSchedule();
  }
  function limitsText(item){
    const parts=[],limits=item.limits;
    if(!limits)return 'Sem limites estruturados para automação.';
    if(limits.amountMin!==null||limits.amountMax!==null)parts.push(`Valor ${limits.amountMin!==null?`de ${currency.format(limits.amountMin)} `:''}${limits.amountMax!==null?`até ${currency.format(limits.amountMax)}`:''}`.trim());
    if(limits.termMin!==null||limits.termMax!==null)parts.push(`prazo ${limits.termMin!==null?`de ${limits.termMin} `:''}${limits.termMax!==null?`até ${limits.termMax} meses`:''}`.trim());
    if(limits.graceMax!==null)parts.push(`carência até ${limits.graceMax} meses`);
    if(limits.system)parts.push(limits.system.toUpperCase());
    return parts.join(' · ');
  }
  function renderCompatibility(){
    const results=document.getElementById('compatibilityResults');results.hidden=false;
    const structured=lastScreening.filter(item=>rules.getProfile(item.line.id));
    const counts=structured.reduce((map,item)=>{map[item.status]=(map[item.status]||0)+1;return map;},{});
    results.innerHTML=`<div class="compatibility-summary"><strong>${counts.preliminarily_eligible||0} pré-enquadrada(s)</strong><span>${counts.needs_review||0} exige(m) conferência</span><span>${counts.ineligible||0} incompatível(is)</span></div><div class="compatibility-grid">${structured.map(item=>{const added=scenarios.some(scenario=>scenario.lineId===item.line.id);const label={preliminarily_eligible:'Pré-enquadrada',needs_review:'Conferir',ineligible:'Incompatível'}[item.status];return `<article class="compatibility-card compatibility-card--${item.status}"><div><span>${escapeHtml(label)}</span><h4>${escapeHtml(item.line.name)}</h4></div><p>${escapeHtml(item.reasons.join(' '))}</p><small>${escapeHtml(limitsText(item))}</small><em>${escapeHtml(item.profile.source)}</em>${item.status!=='ineligible'?`<button type="button" data-add-compatible="${escapeHtml(item.line.id)}"${added||scenarios.length>=4?' disabled':''}>${added?'Já está no comparador':scenarios.length>=4?'Limite de 4 cenários':'Adicionar ao comparador'}</button>`:''}</article>`;}).join('')}</div><p class="compatibility-footnote">Outras ${catalog.lines.length-structured.length} linhas permanecem no catálogo para consulta manual porque os documentos não trazem regras locais suficientes para decisão automática.</p>`;
  }
  function identifyCompatible(){
    const message=document.getElementById('simulationMessage'),input=screeningInput();message.textContent='';
    if(!input.principal||!input.annualRevenue){message.textContent='Informe o valor do crédito e o faturamento anual antes da triagem.';return;}
    lastScreening=eligibility.screen(catalog.lines,input);renderCompatibility();document.getElementById('compatibilityResults').scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  async function fetchOfficialSelic(){
    const button=document.getElementById('loadSelic'),message=document.getElementById('selicMessage');button.disabled=true;message.textContent='Consultando série SGS 1178…';
    try{
      const response=await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.1178/dados/ultimos/1?formato=json',{headers:{Accept:'application/json'}});
      if(!response.ok)throw new Error(`resposta ${response.status}`);
      const data=await response.json(),latest=Array.isArray(data)?data.at(-1):null,value=Number(String(latest?.valor||'').replace(',','.'));
      if(!Number.isFinite(value))throw new Error('valor não disponível');
      selicAnnual=value;document.getElementById('selicValue').textContent=`${value.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}% a.a. · ${latest.data}`;
      scenarios=scenarios.map(scenario=>{const suggestion=rules.suggestedRate(rules.getProfile(scenario.lineId),selicAnnual);return suggestion&&scenario.autoRate!==false?{...scenario,monthlyRate:formattedRate(suggestion),autoRate:true}:scenario;});
      renderScenarios();message.textContent='Taxa obtida da série oficial 1178 do Banco Central.';
    }catch(error){message.textContent=`Consulta indisponível (${error.message}). Informe a taxa do cenário manualmente.`;}
    finally{button.disabled=false;}
  }
  document.getElementById('identifyLines').addEventListener('click',identifyCompatible);
  document.getElementById('loadSelic').addEventListener('click',fetchOfficialSelic);
  document.getElementById('compatibilityResults').addEventListener('click',event=>{
    const button=event.target.closest('[data-add-compatible]');if(!button||scenarios.length>=4)return;
    scenarios.push(makeScenario(button.dataset.addCompatible));renderScenarios();renderCompatibility();
  });
  document.getElementById('addScenario').addEventListener('click',()=>{
    if(scenarios.length>=4){document.getElementById('simulationMessage').textContent='É possível comparar até quatro cenários por vez.';return;}
    scenarios.push(makeScenario(catalog.lines[0].id));renderScenarios();if(lastScreening.length)renderCompatibility();
  });
  document.getElementById('scenarioList').addEventListener('input',event=>{const card=event.target.closest('[data-scenario]');const scenario=scenarios.find(item=>item.id===Number(card?.dataset.scenario));if(scenario&&event.target.dataset.field){scenario[event.target.dataset.field]=event.target.value;if(event.target.dataset.field==='monthlyRate')scenario.autoRate=false;}});
  document.getElementById('scenarioList').addEventListener('change',event=>{if(event.target.dataset.field!=='lineId')return;const card=event.target.closest('[data-scenario]'),index=scenarios.findIndex(item=>item.id===Number(card?.dataset.scenario));if(index<0)return;scenarios[index]=makeScenario(event.target.value,scenarios[index].id);renderScenarios();});
  document.getElementById('scenarioList').addEventListener('click',event=>{const button=event.target.closest('[data-remove-scenario]');if(!button||scenarios.length===1)return;const id=Number(button.closest('[data-scenario]').dataset.scenario);scenarios=scenarios.filter(item=>item.id!==id);renderScenarios();if(lastScreening.length)renderCompatibility();});
  document.getElementById('pjSimulatorForm').addEventListener('submit',event=>{
    event.preventDefault();const message=document.getElementById('simulationMessage');message.textContent='';
    try{
      const shared=screeningInput();
      simulationRuns=scenarios.map((input,index)=>{
        if(String(input.monthlyRate).trim()==='')throw new RangeError(`Informe a taxa do cenário ${index+1}.`);
        const scenarioInput={...shared,installments:Number(input.installments),graceMonths:Number(input.graceMonths)};
        const screening=eligibility.evaluate(catalog.getById(input.lineId),scenarioInput);
        if(screening.status==='ineligible')throw new RangeError(`${scenarioName({input})}: ${screening.reasons.join(' ')}`);
        return {input,eligibility:screening,result:engine.simulateSchedule({principal:shared.principal,installments:scenarioInput.installments,graceMonths:scenarioInput.graceMonths,monthlyRate:parseNumber(input.monthlyRate),fee:parseNumber(input.fee||0),system:input.system})};
      });
      selectedRun=0;renderSimulationResults();document.getElementById('simulationResults').scrollIntoView({behavior:'smooth',block:'start'});
    }catch(error){simulationRuns=[];document.getElementById('simulationResults').hidden=true;message.textContent=error.message||'Não foi possível calcular os cenários.';}
  });
  document.querySelectorAll('.calculator').forEach(form=>form.addEventListener('submit',event=>{
    event.preventDefault(); const values=Object.fromEntries([...new FormData(form)].map(([key,value])=>[key,parseNumber(value)])); const output=form.querySelector('output');
    try { let result;if(form.dataset.calculator==='capacity') result=currency.format(engine.paymentCapacity(values));if(form.dataset.calculator==='participation') result=currency.format(engine.ownParticipation(values));if(form.dataset.calculator==='coverage') result=`${engine.guaranteeCoverage(values).toLocaleString('pt-BR',{minimumFractionDigits:2})}%`;output.textContent=result;output.classList.remove('is-error'); }
    catch(error){output.textContent=error.message;output.classList.add('is-error');}
  }));
  renderScenarios();renderList();renderDetail();
})();
