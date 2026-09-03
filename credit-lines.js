(function () {
  'use strict';
  const catalog = window.CentralCreditCatalog;
  const eligibility = window.CentralCreditEligibility;
  const engine = window.CentralFinancialEngine;
  const currency = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  const escapeHtml = value => String(value ?? '').replace(/[&<>"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
  const parseNumber = value => Number(String(value).trim().replace(/\./g,'').replace(',','.'));
  let selectedId = catalog.lines[0].id;

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
    document.getElementById('creditDetail').innerHTML=`<span class="credit-tag">${escapeHtml(line.family)} · ${escapeHtml(statusLabel(line.status))}</span><h2>${escapeHtml(line.name)}</h2><p><strong>Finalidade:</strong> ${escapeHtml(line.purpose)}</p><p><strong>Público de referência:</strong> ${escapeHtml(line.audience)}</p><h3>Condições documentadas</h3><ul>${line.terms.map(term=>`<li>${escapeHtml(term)}</li>`).join('')}</ul><h3>Fonte e rastreabilidade</h3>${line.sources.map(item=>`<p class="credit-source"><strong>${escapeHtml(item.file)}</strong> · ${escapeHtml(item.pages)}<br>${escapeHtml(item.note)}</p>`).join('')}<section class="eligibility-box"><strong>Triagem preliminar</strong>${line.rules.some(rule=>rule.field==='annualRevenue')?'<label>Faturamento/receita anual (R$)<input id="eligibilityRevenue" inputmode="decimal"></label>':''}<button id="eligibilityCheck" class="button button--secondary" type="button">Verificar critérios locais</button><span id="eligibilityResult" class="eligibility-result"></span></section><div class="simulation-warning"><strong>Simulação financeira indisponível</strong><br>${escapeHtml(engine.simulateLine(line).reason)}</div>`;
    document.getElementById('eligibilityCheck').addEventListener('click',()=>{
      const field=document.getElementById('eligibilityRevenue');
      const result=eligibility.evaluate(line,field&&field.value.trim()?{annualRevenue:parseNumber(field.value)}:{});
      const label={ineligible:'Não enquadrado pelos critérios informados.',needs_review:'Necessita conferência.',preliminarily_eligible:'Pré-enquadramento atendido.'}[result.status];
      document.getElementById('eligibilityResult').textContent=`${label} ${result.reasons.join(' ')}`;
    });
  }
  document.getElementById('creditSearch').addEventListener('input',()=>{renderList();renderDetail();});
  family.addEventListener('change',()=>{renderList();renderDetail();});
  document.querySelectorAll('.calculator').forEach(form=>form.addEventListener('submit',event=>{
    event.preventDefault(); const values=Object.fromEntries([...new FormData(form)].map(([key,value])=>[key,parseNumber(value)])); const output=form.querySelector('output');
    try { let result;if(form.dataset.calculator==='capacity') result=currency.format(engine.paymentCapacity(values));if(form.dataset.calculator==='participation') result=currency.format(engine.ownParticipation(values));if(form.dataset.calculator==='coverage') result=`${engine.guaranteeCoverage(values).toLocaleString('pt-BR',{minimumFractionDigits:2})}%`;output.textContent=result;output.classList.remove('is-error'); }
    catch(error){output.textContent=error.message;output.classList.add('is-error');}
  }));
  renderList(); renderDetail();
})();
