'use strict';

const express = require('express');
const { getDb } = require('../db');
const router = express.Router();

// GET /api/contracts/:id
router.get('/:id', (req, res) => {
  const { vertraege } = getDb();
  const id = Number(req.params.id);

  const contract = vertraege.find(r => r.ID_Vertrag === id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });

  res.json({
    id: contract.ID_Vertrag,
    customerId: contract.ID_Vertrag_Stamm,
    contractNr: contract.Vertragsnr,
    company: contract.Gesellschaft,
    status: contract.VertragsStatus,
    active: contract.Bestand,
    premium: contract.BeitragZahlung,
    premiumTariff: contract.BeitragTarif,
    contractSum: contract.Vertragssumme,
    totalPension: contract.Gesamtrente,
    balance: contract.Saldo,
    startDate: contract.Beginn,
    endDate: contract.Ablauf,
    premiumPayUntil: contract.BeitragszahlungBis,
    submittedDate: contract.eingereicht,
    notes: contract.Bemerkung,
    notesForCustomer: contract.BemerkungFuerKunde,
    advisoryStatus: contract.BeratungsStatus,
    paymentFrequency: contract.Zahlweise,
    applicant: contract.Antragsteller,
  });
});

// GET /api/contracts/:id/documents
router.get('/:id/documents', (req, res) => {
  const { dokumente, verknuepfungen } = getDb();
  const id = Number(req.params.id);

  // tblVerknuepfungen links contracts (ID_Verknuepfung_VertragSchaden) to
  // contacts/documents (ID_Verknuepfung_KontaktBrief)
  const linkedIds = new Set(
    verknuepfungen
      .filter(r => r.ID_Verknuepfung_VertragSchaden === id)
      .map(r => r.ID_Verknuepfung_KontaktBrief)
  );

  // Also include documents directly referencing this contract via ID_Dokument_Fremd
  const docs = dokumente
    .filter(r => r.ID_Dokument_Fremd === id || linkedIds.has(r.ID_Dokument))
    .map(r => ({
      id: r.ID_Dokument,
      date: r.DokuDatum,
      name: r.DokuBezeichnung,
      fileType: r.DokuFileArt,
      pages: r.DokuSeiten,
      category: r.DokuMutterArt,
      fileSize: r.DokuFileSize,
      releasedToCustomer: r.DokumentFuerKundeFreigegeben,
      signStatus: r.DokuSignStatus,
      lastChanged: r.DokuLetzteAenderung,
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json(docs);
});

module.exports = router;
