'use strict';

(function exposeCnpjApi(global) {
  const JSON_HEADERS = { Accept: 'application/json' };

  function valueText(value) {
    if (value && typeof value === 'object') return value.text || value.name || value.description || '';
    return value || '';
  }

  function normalizeCnpja(data) {
    const company = data.company || {};
    const address = data.address || {};
    const mainActivity = data.mainActivity || {};
    const members = Array.isArray(company.members) ? company.members : [];
    const phones = Array.isArray(data.phones) ? data.phones : [];
    const emails = Array.isArray(data.emails) ? data.emails : [];
    const simples = company.simples && typeof company.simples === 'object' ? company.simples : {};
    const simplesHistory = Array.isArray(simples.history) ? simples.history : [];
    const latestSimplesPeriod = simplesHistory.at(-1) || {};

    return {
      cnpj: data.taxId || '',
      razao_social: company.name || '',
      nome_fantasia: data.alias || '',
      descricao_natureza_juridica: valueText(company.nature),
      descricao_identificador_matriz_filial: data.head === true ? 'MATRIZ' : data.head === false ? 'FILIAL' : '',
      porte: valueText(company.size),
      descricao_situacao_cadastral: valueText(data.status),
      capital_social: company.equity,
      data_inicio_atividade: data.founded || '',
      logradouro: address.street || '',
      numero: address.number || 'S/N',
      complemento: address.details || '',
      bairro: address.district || '',
      cep: address.zip || '',
      municipio: address.city || '',
      uf: address.state || '',
      ddd_telefone_1: phones[0] ? `${phones[0].area || ''}${phones[0].number || ''}` : '',
      ddd_telefone_2: phones[1] ? `${phones[1].area || ''}${phones[1].number || ''}` : '',
      email: emails[0]?.address || '',
      cnae_fiscal: mainActivity.id || '',
      cnae_fiscal_descricao: mainActivity.text || '',
      cnaes_secundarios: (Array.isArray(data.sideActivities) ? data.sideActivities : []).map(activity => ({
        codigo: activity.id || '',
        descricao: activity.text || ''
      })),
      qsa: members.map(member => ({
        nome_socio: member.person?.name || '',
        qualificacao_socio: member.role?.text || '',
        cnpj_cpf_do_socio: member.person?.taxId || '',
        data_entrada_sociedade: member.since || ''
      })),
      opcao_pelo_simples: typeof simples.optant === 'boolean' ? simples.optant : null,
      data_opcao_pelo_simples: simples.since || '',
      data_exclusao_do_simples: latestSimplesPeriod.until || '',
      simples_historico: simplesHistory,
      fonte_consulta: 'CNPJá'
    };
  }

  async function readJson(response) {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) throw new Error('A fonte consultada não retornou dados válidos.');
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || 'CNPJ não encontrado.');
    return data;
  }

  function providersFor(cnpj, endpoint = 'cnpj') {
    const encoded = encodeURIComponent(cnpj);
    const providers = [];
    if (/^https?:$/.test(global.location?.protocol || '')) {
      providers.push({ name: 'servidor local', url: `/api/${endpoint}/${encoded}`, normalize: data => data });
    }
    providers.push(
      { name: 'BrasilAPI', url: `https://brasilapi.com.br/api/cnpj/v1/${encoded}`, normalize: data => ({ ...data, fonte_consulta: data.fonte_consulta || 'BrasilAPI' }) },
      { name: 'CNPJá', url: `https://open.cnpja.com/office/${encoded}`, normalize: normalizeCnpja }
    );
    return providers;
  }

  async function request(cnpj) {
    let lastError = null;
    for (const provider of providersFor(cnpj)) {
      try {
        const response = await fetch(provider.url, { headers: JSON_HEADERS });
        const data = await readJson(response);
        return provider.normalize(data);
      } catch (error) {
        lastError = error;
      }
    }
    throw new Error(lastError?.message || 'Não foi possível consultar o CNPJ nas fontes disponíveis.');
  }

  async function requestSimples(cnpj) {
    let firstSuccessful = null;
    let lastError = null;
    for (const provider of providersFor(cnpj, 'simples')) {
      try {
        const response = await fetch(provider.url, { headers: JSON_HEADERS });
        const data = provider.normalize(await readJson(response));
        firstSuccessful ||= data;
        if (typeof data.opcao_pelo_simples === 'boolean') return data;
      } catch (error) {
        lastError = error;
      }
    }
    if (firstSuccessful) return firstSuccessful;
    throw new Error(lastError?.message || 'Não foi possível verificar a opção pelo Simples Nacional.');
  }

  global.CnpjApi = Object.freeze({ request, requestSimples, normalizeCnpja });
})(window);
