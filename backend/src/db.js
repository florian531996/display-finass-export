'use strict';

const fs = require('fs');
const path = require('path');
const { default: MdbReader } = require('mdb-reader');

const ROOT = path.resolve(__dirname, '../..');
const { finassDBPath } = require(path.join(ROOT, 'config.json'));
const MDB_PATH = path.isAbsolute(finassDBPath) ? finassDBPath : path.resolve(ROOT, finassDBPath);

let _cache = null;

function getDb() {
  if (_cache) return _cache;

  console.log('Loading MDB file...');
  const buf = fs.readFileSync(MDB_PATH);
  const db = new MdbReader(buf);

  const load = (name) => db.getTable(name).getData();

  _cache = {
    stamm:              load('tblStamm'),
    personen:           load('tblpersonen'),
    vertraege:          load('tblVertraege'),
    kontakte:           load('tblKontakte'),
    dokumente:          load('tblDokumente'),
    kommunikation:      load('tblKommunikationswege'),
    verknuepfungen:     load('tblVerknuepfungen'),
    aufgaben:           load('tblAufgaben'),
  };

  console.log(`MDB loaded: ${_cache.stamm.length} customers, ${_cache.vertraege.length} contracts, ${_cache.dokumente.length} documents`);
  return _cache;
}

module.exports = { getDb };
