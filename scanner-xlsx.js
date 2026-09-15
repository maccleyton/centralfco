(function (root) {
  'use strict';
  const LIMIT = 40 * 1024 * 1024;
  const decode = text => text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity) => {
    const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
    return entity[0] === '#' ? String.fromCodePoint(entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1))) : named[entity];
  });
  // Restricted OOXML reader: no DTD, external entities, scripts or formula execution.
  function xml(text) {
    if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('XML com entidades externas não é suportado.');
    const document = { name: '', attrs: {}, children: [], text: '' }, stack = [document];
    const tokens = text.match(/<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<[^>]+>|[^<]+/g) || [];
    for (const token of tokens) {
      if (token.startsWith('<?') || token.startsWith('<!--')) continue;
      if (token.startsWith('<![CDATA[')) { stack.at(-1).text += token.slice(9, -3); continue; }
      if (token.startsWith('</')) {
        const name = token.slice(2, -1).trim().split(':').at(-1);
        if (stack.length < 2 || stack.at(-1).name !== name) throw new Error('XML inválido no XLSX.');
        stack.pop();
      } else if (token.startsWith('<')) {
        const match = /^<([\w:.-]+)/.exec(token);
        if (!match) throw new Error('XML inválido no XLSX.');
        const attrs = {};
        for (const attr of token.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[attr[1]] = decode(attr[2] ?? attr[3]);
        const node = { name: match[1].split(':').at(-1), attrs, children: [], text: '' };
        stack.at(-1).children.push(node);
        if (!token.endsWith('/>')) stack.push(node);
      } else stack.at(-1).text += decode(token);
    }
    if (stack.length !== 1) throw new Error('XML incompleto no XLSX.');
    return document;
  }
  const children = (node, name) => node?.children.filter(child => child.name === name) || [];
  const child = (node, name) => children(node, name)[0];
  const allText = node => node ? node.text + node.children.map(allText).join('') : '';
  const texts = node => node ? (node.name === 't' ? node.text : node.children.filter(item => item.name !== 'rPh').map(texts).join('')) : '';
  function address(ref) {
    const match = /^([A-Z]+)(\d+)$/.exec(ref);
    if (!match) throw new Error('Endereço de célula inválido.');
    let col = 0; for (const letter of match[1]) col = col * 26 + letter.charCodeAt(0) - 64;
    return { row: Number(match[2]), col: col - 1 };
  }
  function columnName(index) { let value = index + 1, name = ''; while (value) { value--; name = String.fromCharCode(65 + value % 26) + name; value = Math.floor(value / 26); } return name; }
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
    return (crc ^ 0xffffffff) >>> 0;
  }

  async function unzip(buffer) {
    const bytes = new Uint8Array(buffer), view = new DataView(buffer), decoder = new TextDecoder();
    let end = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
      if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === bytes.length) { end = i; break; }
    }
    if (end < 0) throw new Error('Arquivo XLSX inválido ou protegido por senha.');
    if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) throw new Error('ZIP dividido não é suportado.');
    const count = view.getUint16(end + 10, true); let position = view.getUint32(end + 16, true), total = 0;
    const files = new Map();
    for (let i = 0; i < count; i++) {
      if (position + 46 > bytes.length || view.getUint32(position, true) !== 0x02014b50) throw new Error('Índice ZIP inválido.');
      const flags = view.getUint16(position + 8, true), method = view.getUint16(position + 10, true);
      const checksum = view.getUint32(position + 16, true), compressed = view.getUint32(position + 20, true), size = view.getUint32(position + 24, true);
      const nameLength = view.getUint16(position + 28, true), extraLength = view.getUint16(position + 30, true), commentLength = view.getUint16(position + 32, true);
      const offset = view.getUint32(position + 42, true), name = decoder.decode(bytes.slice(position + 46, position + 46 + nameLength));
      position += 46 + nameLength + extraLength + commentLength;
      if (!/^(xl\/.*\.xml|xl\/_rels\/workbook\.xml\.rels)$/.test(name)) continue;
      if (flags & 1) throw new Error('XLSX protegido por senha não é suportado.');
      total += size; if (total > LIMIT) throw new Error('XLSX descompactado excede 40 MB.');
      if (offset + 30 > bytes.length || view.getUint32(offset, true) !== 0x04034b50) throw new Error('Entrada ZIP inválida.');
      const start = offset + 30 + view.getUint16(offset + 26, true) + view.getUint16(offset + 28, true);
      if (start + compressed > bytes.length) throw new Error('Entrada ZIP incompleta.');
      const content = bytes.slice(start, start + compressed);
      let result = content;
      if (method === 8) {
        let stream;
        try { stream = new DecompressionStream('deflate-raw'); } catch (_) { throw new Error('Atualize o navegador para abrir XLSX; CSV continua disponível.'); }
        const reader = new Blob([content]).stream().pipeThrough(stream).getReader(), chunks = []; let length = 0;
        while (true) {
          const { value, done } = await reader.read(); if (done) break;
          length += value.length; if (length > size || length > LIMIT) { await reader.cancel(); throw new Error('Entrada ZIP excede o tamanho declarado.'); }
          chunks.push(value);
        }
        result = new Uint8Array(length); let cursor = 0; for (const chunk of chunks) { result.set(chunk, cursor); cursor += chunk.length; }
      } else if (method !== 0) throw new Error('Compressão XLSX não suportada.');
      if (result.length !== size) throw new Error('Tamanho de entrada XLSX inconsistente.');
      if (crc32(result) !== checksum) throw new Error('Arquivo XLSX corrompido: verificação de integridade falhou.');
      if (files.has(name)) throw new Error('Entrada duplicada no XLSX.');
      files.set(name, decoder.decode(result));
    }
    return files;
  }
  function excelDate(value, date1904) {
    if (!date1904 && Math.floor(value) === 60) return ''; // Excel's nonexistent 1900-02-29.
    const epoch = Date.UTC(date1904 ? 1904 : 1899, date1904 ? 0 : 11, date1904 ? 1 : 31);
    const adjusted = !date1904 && value > 60 ? value - 1 : value;
    const date = new Date(epoch + Math.round(adjusted * 86400000));
    return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : '';
  }
  async function read(buffer) {
    const files = await unzip(buffer);
    if (!files.has('xl/workbook.xml') || !files.has('xl/_rels/workbook.xml.rels')) throw new Error('Estrutura XLSX não encontrada.');
    const workbook = child(xml(files.get('xl/workbook.xml')), 'workbook');
    const relations = children(child(xml(files.get('xl/_rels/workbook.xml.rels')), 'Relationships'), 'Relationship');
    const strings = files.has('xl/sharedStrings.xml') ? children(child(xml(files.get('xl/sharedStrings.xml')), 'sst'), 'si').map(texts) : [];
    const styles = files.has('xl/styles.xml') ? child(xml(files.get('xl/styles.xml')), 'styleSheet') : null;
    const formats = new Map(children(child(styles, 'numFmts'), 'numFmt').map(node => [Number(node.attrs.numFmtId), node.attrs.formatCode]));
    const cellFormats = children(child(styles, 'cellXfs'), 'xf').map(node => Number(node.attrs.numFmtId || 0));
    const date1904 = ['1', 'true'].includes(child(workbook, 'workbookPr')?.attrs.date1904);
    const sheets = [];
    for (const info of children(child(workbook, 'sheets'), 'sheet')) {
      const rel = relations.find(node => node.attrs.Id === info.attrs['r:id']);
      if (!rel || rel.attrs.TargetMode === 'External') throw new Error('Referência de planilha inválida.');
      if (!/\/worksheet$/.test(rel.attrs.Type || '')) continue;
      const target = rel.attrs.Target.replace(/^\//, ''), path = target.startsWith('xl/') ? target : `xl/${target}`;
      if (!files.has(path)) throw new Error('Conteúdo de planilha não encontrado.');
      const sheet = child(xml(files.get(path)), 'worksheet'), rows = [], warnings = new Set(); let width = 0;
      for (const row of children(child(sheet, 'sheetData'), 'row')) {
        const rowIndex = Number(row.attrs.r) - 1;
        if (rowIndex < 0 || rowIndex >= 10000) throw new Error('XLSX excede 10.000 linhas por aba.');
        rows[rowIndex] = [];
        for (const cell of children(row, 'c')) {
          const point = address(cell.attrs.r); if (point.col >= 512) throw new Error('XLSX excede 512 colunas.');
          if (point.row !== rowIndex + 1) throw new Error('Linha de célula inconsistente.');
          const type = cell.attrs.t, raw = allText(child(cell, 'v')), formatId = cellFormats[Number(cell.attrs.s || 0)] || 0;
          const format = formats.get(formatId) || '', formula = !!child(cell, 'f');
          let value = raw, display = raw;
          if (type === 's') { if (!/^\d+$/.test(raw) || Number(raw) >= strings.length) throw new Error('Texto compartilhado inválido.'); value = display = strings[Number(raw)]; }
          else if (type === 'inlineStr') value = display = texts(child(cell, 'is'));
          else if (type === 'b') { value = raw === '1'; display = value ? 'Sim' : 'Não'; }
          else if (type === 'e') { warnings.add('Há células com erro do Excel; confira antes de importar.'); }
          else if (raw && (!type || type === 'n')) {
            value = Number(raw); if (!Number.isFinite(value)) throw new Error('Número inválido no XLSX.');
            const stripped = format.replace(/"[^"]*"|\\.|\[[^\]]*\]/g, '');
            if ((formatId >= 14 && formatId <= 22) || (formatId >= 45 && formatId <= 47) || /[yd]/i.test(stripped)) value = display = excelDate(value, date1904);
            else if (/^0+$/.test(format) && Number.isInteger(value)) display = String(value).padStart(format.length, '0');
            else if (/%/.test(stripped)) display = `${value * 100}%`;
            else display = String(value);
          }
          if (formula) warnings.add('Fórmulas não são executadas; são usados os resultados salvos no arquivo, que podem estar desatualizados.');
          rows[rowIndex][point.col] = { value, display, formula, type: type || 'n' }; width = Math.max(width, point.col + 1);
        }
      }
      const merges = children(child(sheet, 'mergeCells'), 'mergeCell').map(node => {
        const [from, to = from] = node.attrs.ref.split(':'); return { start: address(from), end: address(to) };
      });
      const headerDepth = Math.max(1, ...merges.filter(merge => merge.start.row === 1 && merge.end.row <= 8).map(merge => merge.end.row));
      sheets.push({ name: info.attrs.name, rows, width, merges, headerDepth, warnings: [...warnings] });
    }
    if (!sheets.length) throw new Error('Nenhuma aba de dados encontrada.');
    return { sheets };
  }
  function table(sheet, headerStart = 1, headerDepth = sheet.headerDepth) {
    if (!Number.isInteger(headerStart) || !Number.isInteger(headerDepth) || headerStart < 1 || headerDepth < 1 || headerDepth > 8 || headerStart + headerDepth - 1 > sheet.rows.length) throw new Error('Intervalo de cabeçalho inválido.');
    const names = [], used = new Set();
    for (let col = 0; col < sheet.width; col++) {
      const parts = [];
      for (let row = headerStart; row < headerStart + headerDepth; row++) {
        const merge = sheet.merges.find(range => row >= range.start.row && row <= range.end.row && col >= range.start.col && col <= range.end.col);
        const source = merge ? sheet.rows[merge.start.row - 1]?.[merge.start.col] : sheet.rows[row - 1]?.[col];
        const part = String(source?.display ?? '').trim(); if (part && parts.at(-1) !== part) parts.push(part);
      }
      const base = parts.join(' / ') || `Coluna ${columnName(col)}`;
      let name = base; if (used.has(name)) name = `${base} [${columnName(col)}]`;
      while (used.has(name)) name += '_'; used.add(name); names.push(name);
    }
    const rows = [], typedRows = [], sourceRows = [];
    for (let index = headerStart + headerDepth - 1; index < sheet.rows.length; index++) {
      const source = sheet.rows[index]; if (!source?.some(cell => cell && cell.display !== '')) continue;
      rows.push(Object.fromEntries(names.map((name, col) => [name, String(source[col]?.display ?? '')])));
      typedRows.push(Object.fromEntries(names.map((name, col) => [name, source[col]?.value ?? null])));
      sourceRows.push(index + 1);
    }
    return { headers: names, rows, typedRows, sourceRows, warnings: sheet.warnings, sheet: sheet.name };
  }
  const api = Object.freeze({ read, table, xml, address, excelDate });
  root.CentralXlsx = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
