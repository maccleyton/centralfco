(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const api = window.CentralPublicData;
  const uf = byId('publicState');
  if (!uf || !api) return;
  const city = byId('publicMunicipality');
  const message = byId('publicDataMessage');
  const populationButton = byId('publicPopulation');
  let revision = 0;

  function options(select, rows, label, value) {
    select.replaceChildren(new Option(label, ''), ...rows.map(row => new Option(row.nome, row[value])));
  }
  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function renderResult(target, data) {
    target.className = `public-result${data.error ? ' is-error' : ''}`;
    target.replaceChildren(node('span', 'public-result__eyebrow', data.eyebrow), node('h5', 'public-result__title', data.title));
    if (data.value) target.append(node('strong', 'public-result__value', data.value));
    if (data.meta?.length) {
      const grid = node('div', 'public-result__meta');
      data.meta.forEach(([label, value]) => {
        const item = node('div');
        item.append(node('small', '', label), node('strong', '', value || 'Não informado'));
        grid.append(item);
      });
      target.append(grid);
    }
    if (data.note) target.append(node('p', 'public-result__note', data.note));
    target.hidden = false;
  }
  function renderError(target, error) {
    renderResult(target, { error: true, eyebrow: 'CONSULTA NÃO CONCLUÍDA', title: error.message || 'Não foi possível consultar o serviço.', note: 'Confira os dados e tente novamente.' });
  }

  async function loadStates() {
    uf.disabled = true;
    message.textContent = 'Carregando estados pela API do IBGE...';
    message.className = 'public-query-message';
    try {
      options(uf, await api.states(), 'Selecione a UF', 'sigla');
      message.textContent = '';
    } catch (error) {
      options(uf, [], 'Estados indisponíveis', 'sigla');
      message.textContent = `${error.message} Atualize a página para tentar novamente.`;
      message.className = 'public-query-message is-error';
    } finally { uf.disabled = false; }
  }

  uf.addEventListener('change', async () => {
    const current = ++revision;
    options(city, [], 'Selecione o município', 'id');
    city.disabled = true;
    populationButton.disabled = true;
    byId('publicPopulationResult').hidden = true;
    if (!uf.value) return;
    message.textContent = 'Consultando municípios...';
    try {
      const rows = await api.municipalities(uf.value);
      if (current !== revision) return;
      options(city, rows, 'Selecione o município', 'id');
      city.disabled = false;
      message.textContent = '';
    } catch (error) { if (current === revision) message.textContent = error.message; }
  });
  city.addEventListener('change', () => {
    byId('publicPopulationResult').hidden = true;
    populationButton.disabled = !city.value;
  });
  populationButton.addEventListener('click', async event => {
    const code = city.value;
    const button = event.currentTarget;
    const result = byId('publicPopulationResult');
    button.disabled = true;
    button.textContent = 'Consultando SIDRA...';
    result.hidden = true;
    try {
      const data = await api.population(code);
      if (city.value !== code) return;
      renderResult(result, {
        eyebrow: 'POPULAÇÃO RESIDENTE ESTIMADA', title: data.municipality,
        value: data.value === null ? 'Dado indisponível' : `${data.value.toLocaleString('pt-BR')} pessoas`,
        meta: [['Ano de referência', data.year], ['Unidade', data.unit], ['Tabela SIDRA', data.table], ['Fonte', 'IBGE']],
        note: 'Valor do último período publicado pelo IBGE. Não representa uma contagem populacional em tempo real.'
      });
    } catch (error) { if (city.value === code) renderError(result, error); }
    finally { button.disabled = !city.value; button.textContent = 'Consultar SIDRA'; }
  });

  const cepInput = byId('publicCep');
  cepInput.addEventListener('input', event => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 8);
    event.target.value = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    byId('publicCepResult').hidden = true;
  });
  byId('publicCepForm').addEventListener('submit', async event => {
    event.preventDefault();
    const button = byId('publicCepButton');
    const result = byId('publicCepResult');
    button.disabled = true;
    button.textContent = 'Consultando ViaCEP...';
    result.hidden = true;
    try {
      const data = await api.cep(cepInput.value);
      renderResult(result, {
        eyebrow: 'ENDEREÇO LOCALIZADO', title: `${data.localidade}-${data.uf}`, value: data.cep,
        meta: [['Logradouro', data.logradouro || 'CEP genérico'], ['Bairro', data.bairro], ['Código IBGE', data.ibge], ['DDD', data.ddd]],
        note: data.logradouro ? 'Confira e informe o número e o complemento antes de utilizar o endereço.' : 'Este é um CEP genérico. O logradouro, número e complemento precisam ser informados manualmente.'
      });
    } catch (error) { renderError(result, error); }
    finally { button.disabled = false; button.textContent = 'Consultar ViaCEP'; }
  });
  loadStates();
})();
