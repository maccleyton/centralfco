(function (root) {
  'use strict';
  const cache = new Map();
  async function get(url) {
    if (cache.has(url)) return cache.get(url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, { signal: controller.signal, credentials: 'omit' });
      if (!response.ok) throw new Error('O serviço público não respondeu. Tente novamente mais tarde.');
      const data = await response.json();
      cache.set(url, data);
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('A consulta excedeu o tempo de espera. Tente novamente.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  const api = {
    async cep(value) {
      const cep = String(value).replace(/\D/g, '');
      if (cep.length !== 8) throw new Error('Informe um CEP com oito dígitos.');
      const data = await get(`https://viacep.com.br/ws/${cep}/json/`);
      if (data.erro) throw new Error('CEP não encontrado. Preencha o endereço manualmente.');
      return data;
    },
    states: () => get('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome'),
    municipalities(uf) {
      if (!/^[A-Z]{2}$/.test(uf)) throw new Error('Selecione uma UF válida.');
      return get(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
    },
    async population(code) {
      if (!/^\d{7}$/.test(String(code))) throw new Error('Selecione um município válido.');
      const rows = await get(`https://apisidra.ibge.gov.br/values/t/6579/n6/${code}/v/9324/p/last`);
      const row = Array.isArray(rows) && rows.find(item => item.D1C === String(code) && item.D2C === '9324');
      if (!row) throw new Error('O SIDRA não retornou o indicador para este município.');
      return { municipality: row.D1N, year: row.D3N, indicator: row.D2N, unit: row.MN,
        value: /^\d+(\.\d+)?$/.test(row.V) ? Number(row.V) : null, table: '6579' };
    }
  };
  root.CentralPublicData = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
