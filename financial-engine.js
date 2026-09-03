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
  function simulateLine(line) {
    return { status:'unavailable', reason:line?.calculation?.reason || 'Não há fórmula documentada e parametrizada para esta linha.' };
  }
  const api = { paymentCapacity, ownParticipation, guaranteeCoverage, simulateLine };
  root.CentralFinancialEngine = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
