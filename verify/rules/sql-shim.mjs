/**
 * PostgreSQL -> SQLite shim.
 *
 * The assignment DDL is authored in PostgreSQL dialect (defensible: native
 * partitioning, exclusion constraints, proper timestamp semantics). The
 * verifier needs to actually EXECUTE it to prove it parses and that its
 * constraints fire, so we translate the handful of features SQLite lacks.
 *
 * Anything SQLite genuinely cannot express is guarded in the source DDL by
 *    -- @pg-only:begin
 *    ...
 *    -- @pg-only:end
 * and stripped here, with the stripping reported as INFO so it is never
 * silently ignored.
 */

const REPLACEMENTS = [
  // Identity columns -> SQLite AUTOINCREMENT
  [/\bINTEGER\s+GENERATED\s+(ALWAYS|BY\s+DEFAULT)\s+AS\s+IDENTITY(\s*\([^)]*\))?\s+PRIMARY\s+KEY\b/gi,
   'INTEGER PRIMARY KEY AUTOINCREMENT'],
  [/\bBIGINT\s+GENERATED\s+(ALWAYS|BY\s+DEFAULT)\s+AS\s+IDENTITY(\s*\([^)]*\))?\s+PRIMARY\s+KEY\b/gi,
   'INTEGER PRIMARY KEY AUTOINCREMENT'],

  // PostgreSQL temporal/UUID/JSON types -> storage-compatible SQLite types
  [/\bTIMESTAMP\s+WITH(OUT)?\s+TIME\s+ZONE\b/gi, 'TEXT'],
  [/\bTIMESTAMPTZ\b/gi,                                  'TEXT'],
  [/\bDOUBLE\s+PRECISION\b/gi,                           'REAL'],
  [/\bUUID\b/g,                                          'TEXT'],
  [/\bJSONB\b/gi,                                        'TEXT'],
  [/\bBYTEA\b/gi,                                        'BLOB'],
  [/\bVARCHAR\s*\(\s*\d+\s*\)/gi,                        'TEXT'],
  [/\bCHARACTER\s+VARYING\s*\(\s*\d+\s*\)/gi,            'TEXT'],
  [/\bCHAR\s*\(\s*\d+\s*\)/gi,                           'TEXT'],
  [/\bNUMERIC\s*\(\s*\d+\s*,\s*\d+\s*\)/gi,              'REAL'],

  // SQLite has no COMMENT ON; strip entirely.
  [/^\s*COMMENT\s+ON\s+[^;]+;\s*$/gim, ''],

  // Schema qualification we do not model.
  [/\bpublic\./gi, ''],
];

/** Strip guarded PostgreSQL-only blocks, recording what was removed. */
function stripPgOnly(sql, stripped) {
  const re = /--\s*@pg-only:begin([\s\S]*?)--\s*@pg-only:end/g;
  return sql.replace(re, (_m, body) => {
    for (const line of body.split('\n')) {
      const t = line.trim();
      if (t && !t.startsWith('--')) stripped.push(t);
    }
    return '\n';
  });
}

/** Translate a PostgreSQL script into something node:sqlite can execute. */
export function toSqlite(sql) {
  const stripped = [];
  let out = stripPgOnly(sql, stripped);

  for (const [re, rep] of REPLACEMENTS) out = out.replace(re, rep);

  return { sql: out, stripped };
}

/** Extract ```sql fenced blocks from markdown. */
export function extractSqlFences(markdown) {
  const blocks = [];
  const re = /```sql\r?\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(markdown)) !== null) blocks.push(m[1]);
  return blocks;
}
