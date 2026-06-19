/**
 * generate-er.js
 *
 * Reads the FINASS MDB and generates three outputs inside finass-db/:
 *   - er-diagram.html        interactive ER diagram (Mermaid, dark theme)
 *   - schemas/<table>.md     one human-readable schema file per table
 *   - db-summary.md          row counts for every table
 *
 * Run:
 *   node generate-er.js
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { execSync, spawnSync } = require('child_process');
const { default: MdbReader } = require('mdb-reader');

// ─── Paths ────────────────────────────────────────────────────────────────────

const DB_DIR              = __dirname;                // finass-data/db/
const ROOT                = path.join(DB_DIR, '..', '..');
const { finassDBPath }    = require(path.join(ROOT, 'config.json'));
const MDB_PATH            = path.isAbsolute(finassDBPath) ? finassDBPath : path.resolve(ROOT, finassDBPath);
const BACKEND_DIR         = path.join(DB_DIR, '..', 'backend');
const OUTPUT_HTML         = path.join(DB_DIR, 'er-diagram.html');
const OUTPUT_RELEVANT_MMD = path.join(DB_DIR, 'er-relevant-parts.mmd');
const OUTPUT_RELEVANT_SVG = path.join(DB_DIR, 'er-relevant-parts.svg');
const SCHEMAS_DIR         = path.join(DB_DIR, 'schemas');
const SUMMARY_PATH        = path.join(DB_DIR, 'db-summary.md');
const MMDC                = path.join(DB_DIR, '..', '..', 'node_modules', '.bin', 'mmdc.cmd');

// ─── FK inference ─────────────────────────────────────────────────────────────
// mdb-reader does not expose Access relationship metadata.
// Convention: ID_<OwnerTable>_<RefTable> → last segment(s) match a table name.

function inferRelationships(tables) {
  const suffixIndex = new Map();
  for (const t of tables) {
    const lower = t.name.toLowerCase();
    suffixIndex.set(lower, t.name);
    if (lower.startsWith('tbl')) suffixIndex.set(lower.slice(3), t.name);
  }

  const relationships = [];
  const seen = new Set();

  for (const table of tables) {
    const ownPKs = new Set(table.columns.filter(c => c.isPK).map(c => c.name.toLowerCase()));

    for (const col of table.columns) {
      const colLower = col.name.toLowerCase();
      if (!colLower.startsWith('id_')) continue;
      if (ownPKs.has(colLower)) continue;

      const parts = col.name.slice(3).split('_'); // drop "ID_"
      let matched = null;
      for (let len = parts.length; len >= 1; len--) {
        const candidate = parts.slice(parts.length - len).join('').toLowerCase();
        const hit = suffixIndex.get('tbl' + candidate) || suffixIndex.get(candidate);
        if (hit && hit !== table.name) { matched = hit; break; }
      }

      if (matched) {
        const key = `${table.name}→${matched}`;
        if (!seen.has(key)) {
          seen.add(key);
          relationships.push({ fromTable: table.name, fromColumn: col.name, toTable: matched });
        }
      }
    }
  }

  return relationships;
}

// ─── Mermaid DSL ─────────────────────────────────────────────────────────────

function sanitize(name) {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

function buildMermaidDsl(tables, relationships) {
  const fkCols = new Set(relationships.map(r => `${r.fromTable}.${r.fromColumn}`));
  const lines = ['erDiagram'];

  for (const table of tables) {
    lines.push(`  ${sanitize(table.name)} {`);
    for (const col of table.columns) {
      let flag = col.isPK ? ' PK' : fkCols.has(`${table.name}.${col.name}`) ? ' FK' : '';
      lines.push(`    ${col.type || 'string'} ${sanitize(col.name)}${flag}`);
    }
    lines.push('  }');
  }

  lines.push('');
  for (const rel of relationships) {
    lines.push(`  ${sanitize(rel.toTable)} ||--o{ ${sanitize(rel.fromTable)} : "${sanitize(rel.fromColumn)}"`);
  }

  return lines.join('\n');
}

// ─── HTML wrapper ─────────────────────────────────────────────────────────────

function buildHtml(mermaidDsl, tableCount, relCount) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FINASS ER Diagram</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #1a1a2e; color: #e0e0e0; min-height: 100vh;
      display: flex; flex-direction: column;
    }
    header {
      padding: 14px 24px; background: #16213e;
      border-bottom: 1px solid #0f3460;
      display: flex; align-items: center; gap: 16px; flex-shrink: 0;
    }
    header h1 { font-size: 1.15rem; color: #e94560; letter-spacing: 0.03em; }
    header .meta { font-size: 0.82rem; color: #888; }
    #diagram-container { flex: 1; padding: 32px; overflow: auto; }
    .mermaid { background: #16213e; border-radius: 10px; padding: 32px; }
  </style>
</head>
<body>
  <header>
    <h1>FINASS ER Diagram</h1>
    <span class="meta">${tableCount} tables &bull; ${relCount} inferred relationships</span>
  </header>
  <div id="diagram-container">
    <pre class="mermaid">
${mermaidDsl}
    </pre>
  </div>
  <script>
    mermaid.initialize({
      startOnLoad: true, theme: 'dark',
      er: { diagramPadding: 40, layoutDirection: 'TB', minEntityWidth: 120, useMaxWidth: false }
    });
  </script>
</body>
</html>`;
}

// ─── Schema file per table (.md) ──────────────────────────────────────────────

function buildSchemaMarkdown(table, rowCount, fkCols) {
  const shortName = table.name.replace(/^tbl/i, '');
  const lines = [
    `# ${table.name}`,
    '',
    `**Rows:** ${rowCount.toLocaleString('de-DE')}`,
    '',
    '## Columns',
    '',
    '| # | Column | Type | Key |',
    '|---|--------|------|-----|',
  ];

  table.columns.forEach((col, i) => {
    let key = '';
    if (col.isPK) key = 'PK';
    else if (fkCols.has(`${table.name}.${col.name}`)) key = 'FK';
    lines.push(`| ${i + 1} | ${col.name} | ${col.type} | ${key} |`);
  });

  return lines.join('\n') + '\n';
}

// ─── DB summary (.md) ─────────────────────────────────────────────────────────

function buildSummaryMarkdown(tables) {
  const sorted = [...tables].sort((a, b) => b.rowCount - a.rowCount);
  const lines = [
    '# FINASS DB — Table Row Counts',
    '',
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    '',
  ];

  const maxLen = Math.max(...sorted.map(t => t.name.length));
  for (const t of sorted) {
    lines.push(`${t.name.padEnd(maxLen)}  ${t.rowCount.toLocaleString('de-DE')}`);
  }

  return lines.join('\n') + '\n';
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log('FINASS Generator');
  console.log('=================');
  console.log(`MDB: ${MDB_PATH}`);

  if (!fs.existsSync(MDB_PATH)) {
    console.error(`ERROR: MDB not found at ${MDB_PATH}`);
    process.exit(1);
  }

  console.log('\n1. Reading MDB...');
  const buf = fs.readFileSync(MDB_PATH);
  const db = new MdbReader(buf);
  const tableNames = db.getTableNames();
  console.log(`   ${tableNames.length} tables found`);

  console.log('\n2. Reading schema and row counts...');
  const tables = [];
  for (const name of tableNames) {
    const t = db.getTable(name);
    const columns = t.getColumns().map(col => ({ name: col.name, type: col.type }));

    const shortName = name.replace(/^tbl/i, '');
    for (const col of columns) {
      const cl = col.name.toLowerCase();
      col.isPK = cl === `id_${name.toLowerCase()}` || cl === `id_${shortName.toLowerCase()}`;
    }

    const rowCount = t.getData().length;
    tables.push({ name, columns, rowCount });
    process.stdout.write(`   ${name}: ${columns.length} cols, ${rowCount.toLocaleString('de-DE')} rows\n`);
  }

  console.log('\n3. Inferring relationships...');
  const relationships = inferRelationships(tables);
  const fkCols = new Set(relationships.map(r => `${r.fromTable}.${r.fromColumn}`));
  console.log(`   ${relationships.length} relationships inferred`);

  console.log('\n4. Writing er-diagram.html...');
  const dsl = buildMermaidDsl(tables, relationships);
  fs.writeFileSync(OUTPUT_HTML, buildHtml(dsl, tables.length, relationships.length), 'utf8');
  console.log(`   ${OUTPUT_HTML}`);

  console.log('\n4b. Writing er-relevant-parts.svg (tables with data only)...');
  const relevantTables = tables.filter(t => t.rowCount > 0);
  const relevantRelationships = relationships.filter(
    r => relevantTables.some(t => t.name === r.fromTable) &&
         relevantTables.some(t => t.name === r.toTable)
  );
  const relevantDsl = buildMermaidDsl(relevantTables, relevantRelationships);
  fs.writeFileSync(OUTPUT_RELEVANT_MMD, relevantDsl, 'utf8');
  try {
    // .cmd files require shell:true on Windows; args are controlled constants so this is safe
    const result = spawnSync(
      MMDC,
      ['-i', OUTPUT_RELEVANT_MMD, '-o', OUTPUT_RELEVANT_SVG, '-t', 'dark', '-b', 'transparent'],
      { cwd: BACKEND_DIR, shell: true, encoding: 'utf8', windowsHide: true }
    );
    if (result.error) throw result.error;
    if (!fs.existsSync(OUTPUT_RELEVANT_SVG)) throw new Error(result.stderr || result.stdout || 'SVG not created');
    console.log(`   ${OUTPUT_RELEVANT_SVG} (${relevantTables.length} tables, ${relevantRelationships.length} relationships)`);
  } catch (e) {
    console.warn(`   mmdc failed: ${e.message}`);
    console.warn(`   The .mmd file was written — render it manually at https://mermaid.live`);
  }

  console.log('\n5. Writing schema files to schemas/...');
  fs.mkdirSync(SCHEMAS_DIR, { recursive: true });
  for (const table of tables) {
    const filePath = path.join(SCHEMAS_DIR, `${table.name}.md`);
    fs.writeFileSync(filePath, buildSchemaMarkdown(table, table.rowCount, fkCols), 'utf8');
  }
  console.log(`   ${tables.length} files written to ${SCHEMAS_DIR}`);

  console.log('\n6. Writing db-summary.md...');
  fs.writeFileSync(SUMMARY_PATH, buildSummaryMarkdown(tables), 'utf8');
  console.log(`   ${SUMMARY_PATH}`);

  console.log('\nOpening ER diagram in browser...');
  try { execSync(`start "" "${OUTPUT_HTML}"`, { stdio: 'ignore' }); }
  catch (e) { console.log(`  Open manually: ${OUTPUT_HTML}`); }

  console.log('\nDone!');
}

main();
