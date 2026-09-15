(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const api = window.CentralPublicData;
  const uf = byId('publicState');
  if (!uf || !api) return;
  const city = byId('publicMunicipality');
  const message = byId('publicDataMessage');
  let revision = 0;
  function options(select, rows, label, value) {
    select.replaceChildren(new Option(label, ''), ...rows.map(row => new Option(row.nome, row[value])));
  }
  async function states() {
    uf.disabled = true;
    try { options(uf, await api.states(), 'Selecione a UF', 'sigla'); message.textContent = ''; }
    catch (error) { message.textContent = error.message; }
    finally { uf.disabled = false; }
  }
  byId('publicLoadStates').addEventListener('click', states);
  uf.addEventListener('change', async () => {
    const current = ++revision;
    options(city, [], 'Selecione o município', 'id'); city.disabled = true;
    byId('publicPopulationResult').textContent = '';
    if (!uf.value) return;
    message.textContent = 'Consultando municípios...';
    try {
      const rows = await api.municipalities(uf.value);
      if (current !== revision) return;
      options(city, rows, 'Selecione o município', 'id'); city.disabled = false; message.textContent = '';
    } catch (error) { if (current === revision) message.textContent = error.message; }
  });
  city.addEventListener('change', () => { byId('publicPopulationResult').textContent = ''; });
  byId('publicPopulation').addEventListener('click', async event => {
    const code = city.value;
    event.currentTarget.disabled = true;
    const button = event.currentTarget;
    const result = byId('publicPopulationResult'); result.textContent = 'Consultando SIDRA...';
    try {
      const data = await api.population(code);
      if (city.value !== code) return;
      result.textContent = `${data.municipality}: ${data.value === null ? 'dado indisponível' : data.value.toLocaleString('pt-BR')} ${data.unit}. ${data.indicator} — ano ${data.year}, tabela ${data.table}. Não representa consulta em tempo real à população.`;
    } catch (error) { if (city.value === code) result.textContent = error.message; }
    finally { button.disabled = false; }
  });
  byId('publicCepForm').addEventListener('submit', async event => {
    event.preventDefault();
    const button = byId('publicCepButton'); const result = byId('publicCepResult');
    button.disabled = true; result.textContent = 'Consultando ViaCEP...';
    try {
      const data = await api.cep(byId('publicCep').value);
      result.textContent = `${data.cep}: ${[data.logradouro, data.bairro, `${data.localidade}-${data.uf}`].filter(Boolean).join(' · ')}. Código IBGE: ${data.ibge || 'indisponível'}. ${data.logradouro ? 'Confira número e complemento.' : 'CEP genérico: informe logradouro e número manualmente.'}`;
    } catch (error) { result.textContent = error.message; }
    finally { button.disabled = false; }
  });
})();
