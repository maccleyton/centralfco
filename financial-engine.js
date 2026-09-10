(function (root) {
  'use strict';
  function money(value, label) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) throw new RangeError(`${label} deve ser um valor válido e não negativo.`);
    return Math.round((number + Number.EPSILON) * 100) / 100;
  }
  function paymentCapacity({ revenue, operatingCosts, otherInstallments }) {
    return Math.round((money(revenue,'Receita') - money(operatingCosts,'Custos') - money(otherInstallments,'Outras prestações')) * 100) / 100;
  }
  function ownParticipation({ totalInvestment, financing }) {
    const result = Math.round((money(totalInvestment,'Investimento total') - money(financing,'Financiamento')) * 100) / 100;
    if (result < 0) throw new RangeError('O financiamento não pode superar o investimento total.');
    return result;
  }
  function guaranteeCoverage({ guaranteeValue, operationValue }) {
    const operation = money(operationValue,'Valor da operação');
    if (operation === 0) throw new RangeError('O valor da operação deve ser maior que zero.');
    return Math.round((money(guaranteeValue,'Valor das garantias') / operation) * 10000) / 100;
  }
  function integer(value, label, minimum=0, maximum=600) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < minimum || number > maximum) throw new RangeError(`${label} deve ser um número inteiro entre ${minimum} e ${maximum}.`);
    return number;
  }
  function round(value) { return Math.round((value + Number.EPSILON) * 100) / 100; }
  function monthlyIrr(netDisbursement, payments) {
    if (netDisbursement <= 0 || !payments.some(value => value > 0)) return null;
    const npv = rate => -netDisbursement + payments.reduce((sum,payment,index)=>sum+(payment/((1+rate)**(index+1))),0);
    let low=0,high=1;
    while(npv(high)>0&&high<16)high*=2;
    if(npv(high)>0)return null;
    for(let index=0;index<100;index+=1){const middle=(low+high)/2;if(npv(middle)>0)low=middle;else high=middle;}
    return (low+high)/2;
  }
  function simulateSchedule({ principal, monthlyRate, installments, graceMonths=0, system='sac', fee=0 }) {
    const amount=money(principal,'Valor do crédito');
    if(amount===0)throw new RangeError('O valor do crédito deve ser maior que zero.');
    const rate=Number(monthlyRate)/100;
    if(!Number.isFinite(rate)||rate<0||rate>1)throw new RangeError('A taxa mensal deve estar entre 0% e 100%.');
    const term=integer(installments,'Prazo',1,600);
    const grace=integer(graceMonths,'Carência',0,120);
    const upfrontFee=money(fee,'Tarifas');
    if(upfrontFee>=amount)throw new RangeError('As tarifas devem ser menores que o valor do crédito.');
    if(!['sac','price'].includes(system))throw new RangeError('Sistema de amortização inválido.');
    const schedule=[];
    let balance=amount;
    for(let month=1;month<=grace;month+=1){
      const interest=round(balance*rate);balance=round(balance+interest);
      schedule.push({month,phase:'grace',openingBalance:round(balance-interest),interest,amortization:0,payment:0,closingBalance:balance});
    }
    const repaymentPrincipal=balance;
    const sacAmortization=round(repaymentPrincipal/term);
    const pricePayment=rate===0?round(repaymentPrincipal/term):round(repaymentPrincipal*(rate*((1+rate)**term))/(((1+rate)**term)-1));
    for(let index=1;index<=term;index+=1){
      const openingBalance=balance;
      const interest=round(openingBalance*rate);
      const amortization=index===term?openingBalance:round(system==='sac'?sacAmortization:Math.max(0,pricePayment-interest));
      const payment=round(amortization+interest);
      balance=round(Math.max(0,openingBalance-amortization));
      schedule.push({month:grace+index,phase:'repayment',openingBalance,interest,amortization,payment,closingBalance:balance});
    }
    const payments=schedule.map(row=>row.payment);
    const paidInstallments=payments.filter(value=>value>0);
    const graceInterest=round(schedule.filter(row=>row.phase==='grace').reduce((sum,row)=>sum+row.interest,0));
    const totalInterest=round(schedule.reduce((sum,row)=>sum+row.interest,0));
    const totalPaid=round(paidInstallments.reduce((sum,value)=>sum+value,0)+upfrontFee);
    const irr=monthlyIrr(amount-upfrontFee,payments);
    return { system,principal:amount,monthlyRate:round(rate*100),installments:term,graceMonths:grace,totalMonths:term+grace,fee:upfrontFee,graceInterest,graceDisbursement:0,firstPayment:paidInstallments[0]||0,lastPayment:paidInstallments.at(-1)||0,averagePayment:paidInstallments.length?round(paidInstallments.reduce((sum,value)=>sum+value,0)/paidInstallments.length):0,totalInterest,totalPaid,effectiveMonthlyCost:irr===null?null:round(irr*100),schedule };
  }
  function simulateLine(line) {
    return { status:'unavailable', reason:line?.calculation?.reason || 'Não há fórmula documentada e parametrizada para esta linha.' };
  }
  const api = { paymentCapacity, ownParticipation, guaranteeCoverage, simulateSchedule, simulateLine };
  root.CentralFinancialEngine = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
