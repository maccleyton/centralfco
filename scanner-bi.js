(function () {
  'use strict';
  const $ = id => document.getElementById(id), KEY = 'centralScannerBiV1';
  const element = (tag, text, className) => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; };
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  let data = null; try { data = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (_) {}
  if (!data || data.version !== 1 || !Array.isArray(data.records) || !Array.isArray(data.portfolio)) { $('biEmpty').hidden = false; return; }
  $('biContent').hidden = false;
  $('biSubtitle').textContent = `${data.sourceName || 'Relatório do Scanner'} · gerado ${data.createdAt ? new Date(data.createdAt).toLocaleString('pt-BR') : 'nesta sessão'}`;
  const totalRevenue = data.records.reduce((sum, record) => sum + (typeof record.revenue === 'number' ? record.revenue : 0), 0);
  $('biAnalyzed').textContent = Number(data.analyzedCount || 0).toLocaleString('pt-BR'); $('biOpportunities').textContent = data.records.length.toLocaleString('pt-BR'); $('biPortfolio').textContent = data.portfolio.length.toLocaleString('pt-BR'); $('biRevenue').textContent = currency.format(totalRevenue);
  const opportunityCounts = new Map();
  for (const record of data.records) for (const opportunity of record.opportunities || []) opportunityCounts.set(opportunity.label, (opportunityCounts.get(opportunity.label) || 0) + 1);
  const opportunityEntries = [...opportunityCounts.entries()].sort((a, b) => b[1] - a[1]), indicationTotal = opportunityEntries.reduce((sum, entry) => sum + entry[1], 0);
  $('biRuleTotal').textContent = `${opportunityEntries.length} regras ativas`; $('biDonutValue').textContent = indicationTotal.toLocaleString('pt-BR');
  const colors = ['#3333bd', '#465eff', '#54dcfc', '#735cc6', '#83ffea']; let cursor = 0;
  const slices = opportunityEntries.map(([, count], index) => { const start = cursor; cursor += indicationTotal ? count / indicationTotal * 100 : 0; return `${colors[index % colors.length]} ${start}% ${cursor}%`; });
  $('biDonut').style.background = slices.length ? `conic-gradient(${slices.join(',')})` : '#e9ebf7';
  function renderBars(container, entries) {
    container.replaceChildren(); const max = Math.max(1, ...entries.map(entry => entry[1]));
    for (const [label, count] of entries) { const item = element('div'), caption = element('div', null, 'bi-bar__label'); caption.append(element('strong', label), element('span', count.toLocaleString('pt-BR'))); const track = element('div', null, 'bi-bar__track'), fill = element('div', null, 'bi-bar__fill'); fill.style.width = `${count / max * 100}%`; track.append(fill); item.append(caption, track); container.append(item); }
    if (!entries.length) container.append(element('p', 'Nenhum indicador disponível.'));
  }
  renderBars($('biOpportunityBars'), opportunityEntries);
  const portfolioCounts = new Map(); for (const record of data.records) { const label = record.portfolio || 'Não informada'; portfolioCounts.set(label, (portfolioCounts.get(label) || 0) + 1); }
  renderBars($('biPortfolioBars'), [...portfolioCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8));
  $('biRuleStatus').replaceChildren();
  for (const rule of data.rules || []) { const item = element('div', null, `bi-rule${rule.enabled ? '' : ' is-disabled'}`); item.append(element('span', rule.label), element('span', rule.enabled ? 'Ativa' : 'Sem mapeamento')); $('biRuleStatus').append(item); }
  $('biRankingBody').replaceChildren();
  data.portfolio.slice(0, 10).forEach((record, index) => { const tr = element('tr'); for (const value of [index + 1, record.client || '—', record.mci || '—', record.portfolio || '—', record.revenue == null ? '—' : currency.format(record.revenue), record.score, (record.opportunities || []).map(item => item.label).join(' · ')]) tr.append(element('td', String(value))); $('biRankingBody').append(tr); });
  $('printBi').addEventListener('click', () => window.print());
})();
