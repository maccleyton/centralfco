(function (root) {
  'use strict';
  const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/';
  const IDB_NAME = 'centralPipelineSQLite';
  const IDB_STORE = 'database';
  const IDB_KEY = 'pipeline.sqlite';
  let database = null;

  function idbRequest(mode, action) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(IDB_STORE);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const connection = request.result;
        const transaction = connection.transaction(IDB_STORE, mode);
        const operation = action(transaction.objectStore(IDB_STORE));
        operation.onsuccess = () => resolve(operation.result);
        operation.onerror = () => reject(operation.error);
        transaction.oncomplete = () => connection.close();
      };
    });
  }
  const loadBytes = () => idbRequest('readonly', store => store.get(IDB_KEY));
  const saveBytes = bytes => idbRequest('readwrite', store => store.put(bytes, IDB_KEY));
  const rows = (sql, params = []) => {
    const statement = database.prepare(sql); statement.bind(params); const result = [];
    while (statement.step()) result.push(statement.getAsObject()); statement.free(); return result;
  };
  const run = (sql, params = []) => database.run(sql, params);
  async function persist() { await saveBytes(database.export()); }
  function migrate() {
    database.run(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS pipeline_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS pipeline_categories (id TEXT PRIMARY KEY, label TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS pipeline_types (id TEXT PRIMARY KEY, category_id TEXT NOT NULL, label TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, FOREIGN KEY(category_id) REFERENCES pipeline_categories(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS pipeline_phases (id TEXT PRIMARY KEY, category_id TEXT NOT NULL, label TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, FOREIGN KEY(category_id) REFERENCES pipeline_categories(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS pipeline_custom_fields (id TEXT PRIMARY KEY, category_id TEXT NOT NULL, type_id TEXT, label TEXT NOT NULL, input_type TEXT NOT NULL, required INTEGER NOT NULL DEFAULT 0, options_json TEXT NOT NULL DEFAULT '[]', sort_order INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, FOREIGN KEY(category_id) REFERENCES pipeline_categories(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS pipeline_responsibles (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, active INTEGER NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS pipeline_operations (id TEXT PRIMARY KEY, payload_json TEXT NOT NULL, updated_at TEXT NOT NULL);
    `);
  }
  const slug = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `item-${Date.now()}`;
  function seed() {
    if (rows('SELECT COUNT(*) AS total FROM pipeline_categories')[0].total) return;
    const categories = [['investimento', 'Investimento', 1], ['giro', 'Giro', 2], ['aditivo', 'Aditivo', 3]];
    const investmentTypes = ['FCO Turismo', 'FCO Rural', 'FCO Serviços', 'FCO Infraestrutura', 'Investimento PJ'];
    database.run('BEGIN');
    try {
      categories.forEach(item => run('INSERT INTO pipeline_categories(id,label,sort_order) VALUES (?,?,?)', item));
      investmentTypes.forEach((label, index) => run('INSERT INTO pipeline_types(id,category_id,label,sort_order) VALUES (?,?,?,?)', [`investimento-${slug(label)}`, 'investimento', label, index + 1]));
      database.run('COMMIT');
    } catch (error) { database.run('ROLLBACK'); throw error; }
  }
  async function open() {
    if (database) return api;
    if (typeof root.initSqlJs !== 'function') throw new Error('O SQLite do navegador não foi carregado. Verifique a conexão e recarregue a página.');
    const SQL = await root.initSqlJs({ locateFile: file => `${CDN}${file}` });
    const stored = await loadBytes(); database = stored ? new SQL.Database(new Uint8Array(stored)) : new SQL.Database();
    migrate(); seed(); await persist(); return api;
  }
  function catalog() {
    const categories = rows('SELECT id,label,sort_order FROM pipeline_categories WHERE active=1 ORDER BY sort_order,label');
    const types = rows('SELECT id,category_id,label,sort_order FROM pipeline_types WHERE active=1 ORDER BY sort_order,label');
    const phases = rows('SELECT id,category_id,label,sort_order FROM pipeline_phases WHERE active=1 ORDER BY sort_order,label');
    const fields = rows('SELECT id,category_id,type_id,label,input_type,required,options_json,sort_order FROM pipeline_custom_fields WHERE active=1 ORDER BY sort_order,label').map(item => ({ ...item, required: Boolean(item.required), options: JSON.parse(item.options_json || '[]') }));
    const responsibles = rows('SELECT id,name FROM pipeline_responsibles WHERE active=1 ORDER BY name');
    return { categories, types, phases, fields, responsibles };
  }
  async function replaceCatalog(model) {
    database.run('BEGIN');
    try {
      for (const table of ['pipeline_custom_fields', 'pipeline_phases', 'pipeline_types', 'pipeline_responsibles', 'pipeline_categories']) database.run(`DELETE FROM ${table}`);
      model.categories.forEach((item, index) => run('INSERT INTO pipeline_categories(id,label,sort_order) VALUES (?,?,?)', [item.id, item.label, index + 1]));
      model.types.forEach((item, index) => run('INSERT INTO pipeline_types(id,category_id,label,sort_order) VALUES (?,?,?,?)', [item.id, item.category_id, item.label, index + 1]));
      model.phases.forEach((item, index) => run('INSERT INTO pipeline_phases(id,category_id,label,sort_order) VALUES (?,?,?,?)', [item.id, item.category_id, item.label, index + 1]));
      model.fields.forEach((item, index) => run('INSERT INTO pipeline_custom_fields(id,category_id,type_id,label,input_type,required,options_json,sort_order) VALUES (?,?,?,?,?,?,?,?)', [item.id, item.category_id, item.type_id || null, item.label, item.input_type, item.required ? 1 : 0, JSON.stringify(item.options || []), index + 1]));
      model.responsibles.forEach(item => run('INSERT INTO pipeline_responsibles(id,name) VALUES (?,?)', [item.id, item.name]));
      database.run('COMMIT'); await persist();
    } catch (error) { database.run('ROLLBACK'); throw error; }
  }
  function operations() { return rows('SELECT payload_json FROM pipeline_operations ORDER BY updated_at').map(item => JSON.parse(item.payload_json)); }
  async function replaceOperations(items) {
    database.run('BEGIN');
    try {
      database.run('DELETE FROM pipeline_operations');
      items.forEach(item => run('INSERT INTO pipeline_operations(id,payload_json,updated_at) VALUES (?,?,?)', [item.id, JSON.stringify(item), new Date().toISOString()]));
      database.run('COMMIT'); await persist();
    } catch (error) { database.run('ROLLBACK'); throw error; }
  }
  const api = Object.freeze({ open, catalog, replaceCatalog, operations, replaceOperations, slug });
  root.CentralPipelineDb = api;
})(window);
