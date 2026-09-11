(function (root) {
  'use strict';

  const profiles = Object.freeze({
    'bndes-digital':{
      purposes:['working_capital'],amount:{min:1000,max:50000},revenue:{minExclusive:360000,max:4800000},term:{min:13,max:24},grace:{max:0},ruralAllowed:false,
      notes:['Exige cobertura de 80% pelo FGI PEAC e garantia complementar para os 20% restantes.'],requirements:[{field:'fgiAvailable',label:'Disponibilidade do FGI PEAC'},{field:'guaranteeCoverage',label:'Cobertura total das garantias de pelo menos 100%',operator:'gte',value:100}],source:'estudo06.pdf, páginas 1 a 7'
    },
    'bndes-giro':{
      purposes:['working_capital'],amount:{min:20000,max:100000000},term:{max:input=>input.annualRevenue<=1000000?12:input.annualRevenue<45000000?24:60},grace:{max:input=>input.annualRevenue<45000000?3:12},
      requirements:[{field:'bndesRisk',label:'Risco do cliente A, B ou C e da operação AA, A ou B'},{field:'activityAllowed',label:'Atividade fora das restrições documentadas'}],notes:['Taxas, TAC, TCA e garantias dependem da configuração vigente.'],source:'estudo09.pdf, páginas 39 a 49'
    },
    'procred-360':{
      purposes:['working_capital','investment'],amount:{max:input=>Math.min((input.womenLeadership?0.6:0.5)*input.annualRevenue,180000)},revenue:{max:360000},term:{max:48},grace:{max:6},system:'sac',rate:{kind:'selic_plus',spreadAnnual:5,label:'Selic + 5% a.a.'},fee:0,
      requirements:[{field:'dicreEnabled',label:'Habilitação pela Dicre'},{field:'companyEstablishedBy2024',label:'Empresa constituída até dezembro de 2024'}],notes:['Sujeita a IOF; o material veda tarifa e exige FGO.'],source:'estudo10.pdf, páginas 13 a 22'
    },
    'pronampe-atual':{
      purposes:['working_capital','investment'],amount:{max:input=>Math.min((input.womenLeadership?0.6:0.5)*input.annualRevenue,500000)},revenue:{minExclusive:360000,max:4800000},term:{max:input=>input.annualRevenue<=2500000?48:60},grace:{max:input=>input.annualRevenue<=2500000?6:9},system:'sac',rate:{kind:'selic_plus',spreadAnnual:6,label:'Selic + 6% a.a.'},fee:0,
      requirements:[{field:'dicreEnabled',label:'Habilitação pela Dicre'}],notes:['Sujeita a IOF; o material veda tarifa e exige FGO.'],source:'estudo10.pdf, páginas 26 a 42'
    },
    'fies-empreendedor':{
      purposes:['working_capital','investment'],amount:{max:180000},term:{max:60},grace:{max:6},rate:{kind:'fixed_annual',annual:11.18,label:'11,18% a.a.'},
      requirements:[{field:'fiesEligible',label:'Sócio elegível e adimplente no FIES'}],notes:['Exige habilitação Dicre e FGO cobrindo 100% do principal.'],source:'estudo11.pdf, páginas 3 a 14'
    },
    'peac-fgi':{
      purposes:['working_capital'],amount:{min:5000,max:10000000},revenue:{max:300000000},term:{max:input=>input.annualRevenue<=1000000?36:input.annualRevenue<=5000000?48:60},grace:{max:6},
      requirements:[{field:'fgiAvailable',label:'Disponibilidade do FGI PEAC'},{field:'dicreEnabled',label:'Habilitação pela Dicre'},{field:'fbaHistoryComplete',label:'FBA mensal completo de janeiro a dezembro'},{field:'socialSecurityRegular',label:'Regularidade com a Seguridade Social'},{field:'noOverdue14',label:'Ausência de operações com atraso superior a 14 dias'},{field:'activityAllowed',label:'CNAE e atividade permitidos'},{field:'guaranteeCoverage',label:'Cobertura total das garantias de pelo menos 100%',operator:'gte',value:100}],notes:['Vedado para investimento fixo. Exige FGI de 80%, garantias complementares, IOF, ECG e TAC.'],source:'estudo12.pdf, páginas 14 a 23'
    },
    'giro-cashback':{
      purposes:['working_capital'],amount:{max:300000},revenue:{max:5000000},term:{max:24},grace:{max:3},system:'price',rate:{kind:'manual_discount',discountMonthly:0.1,label:'Taxa vigente menos 0,10 p.p.'},
      requirements:[{field:'dicreEnabled',label:'Habilitação Dicre para Giro Digital'},{field:'cashbackEligible',label:'Requisitos comerciais do cashback confirmados'}],notes:['A TAC é cobrada na contratação e deve ser informada no cenário.'],source:'estudo13.pdf, páginas 2 a 7'
    }
  });

  const number = value => { if(value===null||value===undefined||value==='')return null;const parsed=Number(value);return Number.isFinite(parsed)?parsed:null; };
  const resolve = (value,input) => typeof value==='function'?value(input):value;
  function annualToMonthly(annualRate){return ((1+annualRate/100)**(1/12)-1)*100;}
  function suggestedRate(profile,selicAnnual){
    if(!profile?.rate)return null;
    if(profile.rate.kind==='fixed_annual')return {monthly:annualToMonthly(profile.rate.annual),annual:profile.rate.annual,label:profile.rate.label,source:'document'};
    if(profile.rate.kind==='selic_plus'&&number(selicAnnual)!==null){const annual=number(selicAnnual)+profile.rate.spreadAnnual;return {monthly:annualToMonthly(annual),annual,label:profile.rate.label,source:'bcb_sgs_1178'};}
    return null;
  }
  function limits(lineId,input={}){
    const profile=profiles[lineId];if(!profile)return null;
    return {
      amountMin:resolve(profile.amount?.min,input)??null,amountMax:resolve(profile.amount?.max,input)??null,
      revenueMinExclusive:resolve(profile.revenue?.minExclusive,input)??null,revenueMax:resolve(profile.revenue?.max,input)??null,
      termMin:resolve(profile.term?.min,input)??null,termMax:resolve(profile.term?.max,input)??null,
      graceMax:resolve(profile.grace?.max,input)??null,system:profile.system||null
    };
  }
  function evaluate(line,input={}){
    const profile=profiles[line?.id];
    if(!line)return {status:'needs_review',reasons:['Linha não localizada no catálogo.'],limits:null,profile:null};
    if(line.status==='historical')return {status:'ineligible',reasons:['Versão histórica: não usar para uma nova contratação.'],limits:null,profile:null};
    if(!profile)return {status:'needs_review',reasons:['A fonte disponível não contém regras estruturadas suficientes para a triagem automática.'],limits:null,profile:null};
    const resolved=limits(line.id,input),failures=[],pending=[];
    const principal=number(input.principal),revenue=number(input.annualRevenue),term=number(input.installments),grace=number(input.graceMonths);
    if(input.purpose&&profile.purposes&&!profile.purposes.includes(input.purpose))failures.push('A finalidade informada não está prevista para esta linha.');
    if(profile.ruralAllowed===false&&input.ruralActivity===true)failures.push('Atividade rural não contemplada pelo material analisado.');
    if(revenue===null)pending.push('Informe o faturamento bruto anual.');
    else{
      if(resolved.revenueMinExclusive!==null&&revenue<=resolved.revenueMinExclusive)failures.push(`O faturamento deve ser superior a ${resolved.revenueMinExclusive.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}.`);
      if(resolved.revenueMax!==null&&revenue>resolved.revenueMax)failures.push(`O faturamento supera ${resolved.revenueMax.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}.`);
    }
    if(principal===null)pending.push('Informe o valor pretendido.');
    else{
      if(resolved.amountMin!==null&&principal<resolved.amountMin)failures.push(`O valor mínimo documentado é ${resolved.amountMin.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}.`);
      if(resolved.amountMax!==null&&principal>resolved.amountMax)failures.push(`O valor supera o limite estimado de ${resolved.amountMax.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}.`);
    }
    if(term===null)pending.push('Informe o prazo desejado.');
    else{
      if(resolved.termMin!==null&&term<resolved.termMin)failures.push(`O prazo mínimo documentado é ${resolved.termMin} meses.`);
      if(resolved.termMax!==null&&term>resolved.termMax)failures.push(`O prazo máximo documentado é ${resolved.termMax} meses.`);
    }
    if(grace===null)pending.push('Informe a carência desejada.');
    else if(resolved.graceMax!==null&&grace>resolved.graceMax)failures.push(`A carência máxima documentada é ${resolved.graceMax} meses.`);
    for(const requirement of profile.requirements||[]){
      if(requirement.operator){
        const value=number(input[requirement.field]);
        if(value===null)pending.push(`Informe: ${requirement.label}.`);
        else if(requirement.operator==='gte'&&value<requirement.value)failures.push(`Não atende: ${requirement.label}.`);
        else if(requirement.operator==='lte'&&value>requirement.value)failures.push(`Não atende: ${requirement.label}.`);
      }else if(input[requirement.field]==='no')failures.push(`Não atende: ${requirement.label}.`);
      else if(input[requirement.field]!=='yes')pending.push(`Confirmar: ${requirement.label}.`);
    }
    if(failures.length)return {status:'ineligible',reasons:failures,limits:resolved,profile};
    if(pending.length)return {status:'needs_review',reasons:pending,limits:resolved,profile};
    return {status:'preliminarily_eligible',reasons:['Os critérios locais documentados foram atendidos; a aprovação e a precificação continuam sujeitas à análise vigente.'],limits:resolved,profile};
  }
  function screen(lines,input){const order={preliminarily_eligible:0,needs_review:1,ineligible:2};return lines.map(line=>({line,...evaluate(line,input)})).sort((a,b)=>order[a.status]-order[b.status]);}

  const api={profiles,getProfile:id=>profiles[id]||null,limits,evaluate,screen,suggestedRate,annualToMonthly};
  root.CentralCreditRules=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
