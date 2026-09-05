(function (root) {
  'use strict';

  const STORAGE_KEY = 'centralEmpresasCompaniesV1';
  const SCHEMA_VERSION = 1;
  const MAX_RECORDS = 20;
  const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  let memoryState = { version: SCHEMA_VERSION, currentCnpj: '', companies: {} };

  const cleanCnpj = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14);
  const text = value => String(value || '').trim();

  function read() {
    try {
      const parsed = JSON.parse(root.localStorage?.getItem(STORAGE_KEY) || 'null');
      if (parsed?.version === SCHEMA_VERSION && parsed.companies && typeof parsed.companies === 'object') return parsed;
    } catch (_) {}
    return memoryState;
  }

  function write(state) {
    memoryState = state;
    try { root.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
    return state;
  }

  function normalizeCompany(input = {}, options = {}) {
    const nestedAddress = input.endereco || input.address || {};
    const cnpj = cleanCnpj(input.cnpj || input.document || input.cnpjFormatado);
    if (!cnpj) throw new TypeError('CNPJ é obrigatório para o cadastro compartilhado.');
    const streetType = text(input.descricao_tipo_de_logradouro || input.descricao_tipo_logradouro);
    const rawStreet = text(nestedAddress.logradouro || nestedAddress.street || input.logradouro);
    const street = streetType && !rawStreet.toLocaleLowerCase('pt-BR').startsWith(streetType.toLocaleLowerCase('pt-BR'))
      ? `${streetType} ${rawStreet}`.trim() : rawStreet;
    const simpleValue = input.simplesOptante ?? input.opcao_pelo_simples ?? input.simple;
    return {
      schemaVersion: SCHEMA_VERSION,
      cnpj,
      legalName: text(input.razaoSocial || input.razao_social || input.legalName || input.name || input.nome),
      tradeName: text(input.nomeFantasia || input.nome_fantasia || input.tradeName || input.fantasia),
      legalNature: text(input.naturezaJuridica || input.descricao_natureza_juridica || input.legalNature),
      branchType: text(input.tipoEstabelecimento || input.descricao_identificador_matriz_filial || input.branchType),
      size: text(input.porte || input.descricao_porte || input.size),
      registrationStatus: text(input.situacao || input.descricao_situacao_cadastral || input.registrationStatus),
      foundedAt: text(input.data_inicio_atividade || input.foundedAt),
      simple: typeof simpleValue === 'boolean' ? simpleValue : null,
      address: {
        street,
        number: text(nestedAddress.numero || nestedAddress.number || input.numero) || 'S/N',
        complement: text(nestedAddress.complemento || nestedAddress.complement || input.complemento),
        district: text(nestedAddress.bairro || nestedAddress.district || input.bairro),
        zip: text(nestedAddress.cep || nestedAddress.zip || input.cep),
        city: text(nestedAddress.municipio || nestedAddress.city || input.municipio),
        state: text(nestedAddress.uf || nestedAddress.state || input.uf).toUpperCase()
      },
      fullAddress: text(input.enderecoCompleto || input.fullAddress),
      source: text(options.source || input.fonte_consulta || input.source) || 'Cadastro local',
      updatedAt: new Date().toISOString()
    };
  }

  function purgeExpired(state = read()) {
    const cutoff = Date.now() - MAX_AGE_MS;
    const companies = Object.fromEntries(Object.entries(state.companies).filter(([,company]) => {
      const timestamp = Date.parse(company.updatedAt);
      return Number.isFinite(timestamp) && timestamp >= cutoff;
    }));
    const currentCnpj = companies[state.currentCnpj] ? state.currentCnpj : '';
    return write({ version: SCHEMA_VERSION, currentCnpj, companies });
  }

  function upsertCompany(input, options = {}) {
    const company = normalizeCompany(input, options);
    const state = purgeExpired(read());
    const ordered = Object.values({ ...state.companies, [company.cnpj]: company })
      .sort((a,b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, MAX_RECORDS);
    write({ version: SCHEMA_VERSION, currentCnpj: company.cnpj, companies: Object.fromEntries(ordered.map(item => [item.cnpj,item])) });
    try { root.dispatchEvent?.(new CustomEvent('central-company-updated',{detail:company})); } catch (_) {}
    return company;
  }

  function getCompany(cnpj) { return purgeExpired(read()).companies[cleanCnpj(cnpj)] || null; }
  function getCurrent() { const state = purgeExpired(read()); return state.companies[state.currentCnpj] || null; }
  function listCompanies() { return Object.values(purgeExpired(read()).companies).sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt)); }
  function clear() { write({ version:SCHEMA_VERSION,currentCnpj:'',companies:{} }); }

  const api = { STORAGE_KEY, SCHEMA_VERSION, MAX_AGE_MS, cleanCnpj, normalizeCompany, upsertCompany, getCompany, getCurrent, listCompanies, purgeExpired, clear };
  root.CentralData = Object.freeze(api);
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
