'use strict';

const express = require('express');
const { getDb } = require('../db');
const router = express.Router();

// GET /api/customers?search=
router.get('/', (req, res) => {
  const { stamm, vertraege, kommunikation } = getDb();
  const search = (req.query.search || '').toLowerCase().trim();

  let results = stamm;
  if (search) {
    results = stamm.filter(r =>
      (r.StammGesamtname || '').toLowerCase().includes(search) ||
      (r.Ort || '').toLowerCase().includes(search) ||
      (r.PLZ || '').toLowerCase().includes(search)
    );
  }

  const contractCountByStamm = {};
  for (const v of vertraege) {
    const k = v.ID_Vertrag_Stamm;
    contractCountByStamm[k] = (contractCountByStamm[k] || 0) + 1;
  }

  res.json(results.map(r => ({
    id: r.ID_Stamm,
    name: r.StammGesamtname,
    street: r.Strasse,
    zip: r.PLZ,
    city: r.Ort,
    status: r.KundenStatus,
    notes: r.Notizen,
    contractCount: contractCountByStamm[r.ID_Stamm] || 0,
  })));
});

// GET /api/customers/:id
router.get('/:id', (req, res) => {
  const { stamm, personen, kommunikation, vertraege, kontakte } = getDb();
  const id = Number(req.params.id);

  const customer = stamm.find(r => r.ID_Stamm === id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const persons = personen
    .filter(r => r.ID_Person_Stamm === id)
    .map(r => ({
      id: r.ID_Person,
      salutation: r.Pers,
      firstName: r.Vorname,
      lastName: r.Nachname,
      birthDate: r.Geburtsdatum,
      gender: r.Geschlecht_maennlich,
      occupation: r.Beruf,
      employer: r.Arbeitgeber,
      maritalStatus: r.Familienstand,
      netIncome: r.EKNettoMTL,
    }));

  const contactInfo = kommunikation
    .filter(r => r.ID_Kommunikationsweg_Fremd === id)
    .map(r => ({
      id: r.ID_Kommunikationsweg,
      type: r.KommArt,
      label: r.KommBezeichnung,
      value: r.KommWert,
    }));

  const contractCount = vertraege.filter(r => r.ID_Vertrag_Stamm === id).length;
  const contactCount = kontakte.filter(r => r.ID_Kontakte_Stamm === id).length;

  res.json({
    id: customer.ID_Stamm,
    name: customer.StammGesamtname,
    salutation: customer.AnredeAnschrift,
    street: customer.Strasse,
    zip: customer.PLZ,
    city: customer.Ort,
    status: customer.KundenStatus,
    notes: customer.Notizen,
    remarks: customer.StammBemerkungen,
    goals: customer.ZieleUndWuensche,
    contractCount,
    contactCount,
    persons,
    contactInfo,
  });
});

// GET /api/customers/:id/contracts
router.get('/:id/contracts', (req, res) => {
  const { vertraege } = getDb();
  const id = Number(req.params.id);

  const contracts = vertraege
    .filter(r => r.ID_Vertrag_Stamm === id)
    .map(r => ({
      id: r.ID_Vertrag,
      contractNr: r.Vertragsnr,
      company: r.Gesellschaft,
      status: r.VertragsStatus,
      active: r.Bestand,
      premium: r.BeitragZahlung,
      startDate: r.Beginn,
      endDate: r.Ablauf,
      contractSum: r.Vertragssumme,
      notes: r.Bemerkung,
    }))
    .sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0));

  res.json(contracts);
});

// GET /api/customers/:id/contacts
router.get('/:id/contacts', (req, res) => {
  const { kontakte } = getDb();
  const id = Number(req.params.id);

  const contacts = kontakte
    .filter(r => r.ID_Kontakte_Stamm === id)
    .map(r => ({
      id: r.ID_Kontakte,
      date: r.KontaktDatum,
      subject: r.KontaktBetreff,
      type: r.KontaktArt,
      with: r.KontaktMit,
      result: r.KontaktErgebnis,
      status: r.KontaktStatus,
      textPlain: r.KontaktTextPlain,
      durationMin: r.KontaktDauerMin || null,
      from: r.MailAbsenderMailadresse || null,
      to: r.Empfaenger || null,
      cc: r.MailCC || null,
      attachments: r.MailAnhangAnzahl || null,
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json(contacts);
});

// GET /api/customers/:id/documents
router.get('/:id/documents', (req, res) => {
  const { dokumente, stamm } = getDb();
  const id = Number(req.params.id);

  if (!stamm.find(r => r.ID_Stamm === id)) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const docs = dokumente
    .filter(r => r.ID_Dokument_Fremd === id && r.DokuMutterArt === 'H')
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
