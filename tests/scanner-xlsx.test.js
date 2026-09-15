const test = require('node:test');
const assert = require('node:assert/strict');
const { deflateRawSync } = require('node:zlib');
const xlsx = require('../scanner-xlsx');
const scanner = require('../scanner-core');

// Minimal generated OOXML fixture; contains no customer data.
function zip(entries, deflate = true) {
  const local = [], central = []; let offset = 0;
  for (const [path, text] of Object.entries(entries)) {
    const name = Buffer.from(path), body = Buffer.from(text), compressed = deflate ? deflateRawSync(body) : body;
    let crc = 0xffffffff;
    for (const byte of body) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
    crc = (crc ^ 0xffffffff) >>> 0;
    const header = Buffer.alloc(30); header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt16LE(deflate ? 8 : 0, 8); header.writeUInt32LE(crc, 14); header.writeUInt32LE(compressed.length, 18); header.writeUInt32LE(body.length, 22); header.writeUInt16LE(name.length, 26);
    local.push(header, name, compressed);
    const directory = Buffer.alloc(46); directory.writeUInt32LE(0x02014b50); directory.writeUInt16LE(20, 4); directory.writeUInt16LE(20, 6); directory.writeUInt16LE(deflate ? 8 : 0, 10); directory.writeUInt32LE(crc, 16); directory.writeUInt32LE(compressed.length, 20); directory.writeUInt32LE(body.length, 24); directory.writeUInt16LE(name.length, 28); directory.writeUInt32LE(offset, 42);
    central.push(directory, name); offset += header.length + name.length + compressed.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(Object.keys(entries).length, 8); end.writeUInt16LE(Object.keys(entries).length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  const bytes = Buffer.concat([...local, directory, end]); return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}
const files = {
  'xl/workbook.xml': '<workbook xmlns:r="relationships"><sheets><sheet name="Clientes" r:id="r1"/><sheet name="Vazia" r:id="r2"/></sheets></workbook>',
  'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="r1" Target="worksheets/sheet1.xml" Type="http://example/worksheet"/><Relationship Id="r2" Target="worksheets/sheet2.xml" Type="http://example/worksheet"/></Relationships>',
  'xl/styles.xml': '<styleSheet><numFmts><numFmt numFmtId="164" formatCode="00000"/></numFmts><cellXfs><xf numFmtId="0"/><xf numFmtId="164"/><xf numFmtId="14"/><xf numFmtId="10"/></cellXfs></styleSheet>',
  'xl/sharedStrings.xml': '<sst><si><r><t>Fluxo</t></r><r><t> &amp; PIX</t></r></si></sst>',
  'xl/worksheets/sheet1.xml': '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>MCI</t></is></c><c r="B1" t="s"><v>0</v></c></row><row r="2"><c r="B2" t="inlineStr"><is><t>Volume</t></is></c><c r="C2" t="inlineStr"><is><t>Volume</t></is></c></row><row r="3"><c r="A3" s="1"><v>123</v></c><c r="B3"><v>150000.25</v></c><c r="C3" s="3"><v>0.25</v></c><c r="D3" s="2"><v>46280</v></c><c r="E3" t="b"><v>1</v></c><c r="F3"><f>1+1</f><v>2</v></c></row><row r="4"><c r="A4" s="1"><v>123</v></c><c r="B4"><v>0</v></c></row></sheetData><mergeCells><mergeCell ref="A1:A2"/><mergeCell ref="B1:C1"/></mergeCells></worksheet>',
  'xl/worksheets/sheet2.xml': '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>MCI</t></is></c></row></sheetData></worksheet>'
};
for (const deflate of [true, false]) test(`XLSX ${deflate ? 'deflated' : 'stored'} preserves merged headers, zeros, types and multiple sheets`, async () => {
  const book = await xlsx.read(zip(files, deflate));
  assert.equal(book.sheets.length, 2);
  const table = xlsx.table(book.sheets[0]);
  assert.equal(book.sheets[0].headerDepth, 2);
  assert.deepEqual(table.headers.slice(0, 3), ['MCI', 'Fluxo & PIX / Volume', 'Fluxo & PIX / Volume [C]']);
  assert.equal(table.rows[0].MCI, '00123');
  assert.equal(table.rows[0]['Coluna D'], '2026-09-15');
  assert.equal(table.rows[0]['Coluna E'], 'Sim');
  assert.equal(table.typedRows[0]['Fluxo & PIX / Volume'], 150000.25);
  assert.equal(table.typedRows[0]['Fluxo & PIX / Volume [C]'], 0.25);
  assert.equal(table.rows.length, 2); // Same MCI, distinct source records.
  assert.deepEqual(table.sourceRows, [3, 4]);
  assert.equal(table.warnings.length, 1);
  assert.equal(xlsx.table(book.sheets[1]).rows.length, 0);
});
test('corrupted, invalid and external-entity files are rejected', async () => {
  await assert.rejects(xlsx.read(new ArrayBuffer(30)), /inválido/);
  const bytes = new Uint8Array(zip(files, false)); bytes[70] ^= 1;
  await assert.rejects(xlsx.read(bytes.buffer));
  assert.throws(() => xlsx.xml('<!DOCTYPE x [<!ENTITY y SYSTEM "secret">]><x/>'), /entidades/);
  assert.throws(() => xlsx.xml('<x><y></x>'), /inválido/);
});
test('Excel date systems include leap-year workaround and 1904 epoch', () => {
  assert.equal(xlsx.excelDate(1, false), '1900-01-01');
  assert.equal(xlsx.excelDate(60, false), '');
  assert.equal(xlsx.excelDate(61, false), '1900-03-01');
  assert.equal(xlsx.excelDate(0, true), '1904-01-01');
});
test('typed filters respect blanks, percent units, signed values and calendar dates', () => {
  assert.equal(scanner.matches({ Share: '25%' }, { Share: 0.25 }, { column: 'Share', operator: 'gt', value: '20%' }), true);
  assert.equal(scanner.matches({ Saldo: '-100' }, { Saldo: -100 }, { column: 'Saldo', operator: 'lt', value: '-50' }), true);
  assert.equal(scanner.matches({ Saldo: '' }, { Saldo: null }, { column: 'Saldo', operator: 'lt', value: '1' }), false);
  assert.equal(scanner.matches({ Data: '2026-07-08 00:00:00.000' }, null, { column: 'Data', operator: 'before', value: '2026-09-15' }), true);
  assert.equal(scanner.matches({ Volume: '100' }, null, { column: 'Volume', operator: 'between', value: '100', upper: '200' }), true);
});
