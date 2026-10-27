import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');
db.exec("CREATE TABLE t(a INTEGER PRIMARY KEY, b TEXT NOT NULL CHECK (b <> ''))");
db.prepare('INSERT INTO t(b) VALUES(?)').run('ok');

const rows = db.prepare('SELECT * FROM t').all();
console.log('node:sqlite OK ->', JSON.stringify(rows));

// Probe the PostgreSQL features the shim needs to handle
const probes = [
  ['SERIAL', 'CREATE TABLE p1(id SERIAL PRIMARY KEY, x TEXT)'],
  ['BIGSERIAL', 'CREATE TABLE p2(id BIGSERIAL PRIMARY KEY)'],
  ['TIMESTAMPTZ', 'CREATE TABLE p3(t TIMESTAMPTZ NOT NULL)'],
  ['UUID', 'CREATE TABLE p4(u UUID)'],
  ['NUMERIC', 'CREATE TABLE p5(v NUMERIC(6,2))'],
  ['JSONB', 'CREATE TABLE p6(j JSONB)'],
  ['IDENTITY', 'CREATE TABLE p7(id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY)'],
  ['PARTIAL INDEX', 'CREATE INDEX ix ON p1(x) WHERE x IS NOT NULL'],
  ['ON CONFLICT', 'INSERT INTO p1(x) VALUES($1) ON CONFLICT DO NOTHING'],
  ['EXCLUDE CONSTRAINT', `CREATE TABLE p8(a INT, EXCLUDE USING gist (a WITH =))`],
  ['COMMENT ON', 'COMMENT ON TABLE p1 IS \'x\''],
];
for (const [name, sql] of probes) {
  try { db.exec(sql); console.log('  native:', name); }
  catch (e) { console.log('  NEEDS SHIM:', name, '->', e.message.slice(0, 70)); }
}
console.log('sqlite version:', db.prepare('select sqlite_version() v').get().v);
