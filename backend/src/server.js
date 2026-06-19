'use strict';

const express = require('express');
const cors = require('cors');
const { getDb } = require('./db');
const customersRouter = require('./routes/customers');
const contractsRouter = require('./routes/contracts');
const documentsRouter = require('./routes/documents');

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Warm up DB on start
getDb();

app.use('/api/customers', customersRouter);
app.use('/api/contracts', contractsRouter);
app.use('/api/documents', documentsRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`\nFINASS backend running at http://localhost:${PORT}`);
});
