const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../central-data.js');

test('normaliza e compartilha somente o cadastro empresarial', () => {
  data.clear();
  const company = data.upsertCompany({
    cnpj:'12.345.678/0001-95', razao_social:'Empresa Teste Ltda', nome_fantasia:'Teste',
    logradouro:'Rua Central', numero:'10', municipio:'Bonito', uf:'ms', opcao_pelo_simples:true,
    valorFinanciado:999999
  },{source:'Teste automatizado'});
  assert.equal(company.cnpj,'12345678000195');
  assert.equal(company.legalName,'Empresa Teste Ltda');
  assert.equal(company.address.state,'MS');
  assert.equal(company.simple,true);
  assert.equal(company.valorFinanciado,undefined);
  assert.equal(data.getCurrent().cnpj,company.cnpj);
  data.clear();
});

test('rejeita registro sem CNPJ', () => {
  assert.throws(()=>data.normalizeCompany({razao_social:'Sem documento'}),TypeError);
});
