'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const { simpleParser } = require('mailparser');
const { getDb } = require('../db');
const router = express.Router();

const ROOT = path.resolve(__dirname, '../../..');
const { finassDocumentsPath } = require(path.join(ROOT, 'config.json'));
const DOCUMENTS_DIR = path.isAbsolute(finassDocumentsPath) ? finassDocumentsPath : path.resolve(ROOT, finassDocumentsPath);

function resolveFilePath(doc) {
  const dir = String(doc.DokuVerzeichnisNummer).padStart(5, '0');
  const base = path.join(DOCUMENTS_DIR, dir, String(doc.ID_Dokument));
  const ext = doc.DokuFileArt || '';
  let p = `${base}.${ext}`;
  if (!fs.existsSync(p)) p = `${base}.${ext.toLowerCase()}`;
  return fs.existsSync(p) ? p : null;
}

// GET /api/documents/:docId/file — serve raw file
router.get('/:docId/file', (req, res) => {
  const { dokumente } = getDb();
  const doc = dokumente.find(r => r.ID_Dokument === Number(req.params.docId));
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const filePath = resolveFilePath(doc);
  if (!filePath) return res.status(404).json({ error: 'File not found on disk' });

  res.sendFile(filePath);
});

// GET /api/documents/:docId/parsed — parse EML and return structured JSON
router.get('/:docId/parsed', async (req, res) => {
  const { dokumente } = getDb();
  const doc = dokumente.find(r => r.ID_Dokument === Number(req.params.docId));
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const filePath = resolveFilePath(doc);
  if (!filePath) return res.status(404).json({ error: 'File not found on disk' });

  try {
    const parsed = await simpleParser(fs.readFileSync(filePath));

    res.json({
      from:        parsed.from?.text  || null,
      to:          parsed.to?.text    || null,
      subject:     parsed.subject     || null,
      date:        parsed.date?.toISOString() || null,
      bodyHtml:    parsed.html        || null,
      bodyText:    parsed.text        || null,
      attachments: (parsed.attachments || []).map((att, i) => ({
        index:       i,
        filename:    att.filename || `Anhang-${i + 1}`,
        contentType: att.contentType || 'application/octet-stream',
        size:        att.size || att.content?.length || 0,
        data:        att.content?.toString('base64') || null,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse email', detail: err.message });
  }
});

module.exports = router;
