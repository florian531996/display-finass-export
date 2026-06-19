import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { fmt, contractStatusBadge, customerStatusBadge, contactTypeBadge, contactTypeLabel } from '../utils';
import DocumentsTab from '../components/DocumentsTab';

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <span className="sort-icon">⇅</span>;
  return <span className="sort-icon active">{sortDir === 'asc' ? '▲' : '▼'}</span>;
}

function PersonsTab({ persons }) {
  if (!persons?.length) return <div className="empty">Keine Personen verknüpft.</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Geburtsdatum</th>
            <th>Beruf</th>
            <th>Arbeitgeber</th>
            <th>Familienstand</th>
            <th>Nettoeinkommen</th>
          </tr>
        </thead>
        <tbody>
          {persons.map(p => (
            <tr key={p.id}>
              <td>{[p.salutation, p.firstName, p.lastName].filter(Boolean).join(' ')}</td>
              <td className="nowrap">{fmt(p.birthDate, 'date')}</td>
              <td>{p.occupation || '—'}</td>
              <td>{p.employer || '—'}</td>
              <td>{p.maritalStatus || '—'}</td>
              <td>{fmt(p.netIncome, 'currency')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContractsTab({ customerId }) {
  const [contracts, setContracts] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const navigate = useNavigate();

  useEffect(() => {
    api.getCustomerContracts(customerId)
      .then(setContracts)
      .catch(e => setError(e.message));
  }, [customerId]);

  if (error) return <div className="error-box">Fehler: {error}</div>;
  if (!contracts) return <div className="loading">Lade Verträge…</div>;
  if (!contracts.length) return <div className="empty">Keine Verträge vorhanden.</div>;

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }

  const q = filter.toLowerCase();
  const filtered = contracts.filter(c =>
    !q ||
    (c.contractNr || '').toLowerCase().includes(q) ||
    (c.company || '').toLowerCase().includes(q)
  );

  const sorted = [...filtered].sort((a, b) => {
    if (!sortCol) return 0;
    let av, bv;
    if (sortCol === 'premium') {
      av = Number(a.premium) || 0; bv = Number(b.premium) || 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    }
    if (sortCol === 'startDate' || sortCol === 'endDate') {
      av = new Date(a[sortCol] || 0); bv = new Date(b[sortCol] || 0);
      return sortDir === 'asc' ? av - bv : bv - av;
    }
    if (sortCol === 'status') {
      av = Number(a.status) || 0; bv = Number(b.status) || 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    }
    av = (a[sortCol] || '').toLowerCase();
    bv = (b[sortCol] || '').toLowerCase();
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div>
      <div className="filter-bar">
        <input
          className="filter-input"
          placeholder="Nach Vertragsnr. oder Gesellschaft filtern…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSort('contractNr')}>
                Vertragsnr. <SortIcon col="contractNr" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className="sortable" onClick={() => handleSort('company')}>
                Gesellschaft <SortIcon col="company" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className="sortable" onClick={() => handleSort('status')}>
                Status <SortIcon col="status" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className="sortable" onClick={() => handleSort('premium')}>
                Beitrag <SortIcon col="premium" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className="sortable" onClick={() => handleSort('startDate')}>
                Beginn <SortIcon col="startDate" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className="sortable" onClick={() => handleSort('endDate')}>
                Ablauf <SortIcon col="endDate" sortCol={sortCol} sortDir={sortDir} />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => (
              <tr
                key={c.id}
                className="clickable-row"
                onClick={() => navigate(`/contracts/${c.id}`)}
              >
                <td className="nowrap">{c.contractNr || '—'}</td>
                <td>{c.company || '—'}</td>
                <td>{contractStatusBadge(c.status, c.active)}</td>
                <td className="nowrap">{fmt(c.premium, 'currency')}</td>
                <td className="nowrap">{fmt(c.startDate, 'date')}</td>
                <td className="nowrap">{fmt(c.endDate, 'date')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ContactsTab({ customerId }) {
  const [contacts, setContacts] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    api.getCustomerContacts(customerId)
      .then(setContacts)
      .catch(e => setError(e.message));
  }, [customerId]);

  if (error) return <div className="error-box">Fehler: {error}</div>;
  if (!contacts) return <div className="loading">Lade Korrespondenz…</div>;
  if (!contacts.length) return <div className="empty">Keine Korrespondenz vorhanden.</div>;

  const types = [...new Set(contacts.map(c => c.type).filter(Boolean))].sort();

  const q = filter.toLowerCase();
  const filtered = contacts.filter(c =>
    (!typeFilter || c.type === typeFilter) &&
    (!q ||
      (c.subject || '').toLowerCase().includes(q) ||
      (c.with || '').toLowerCase().includes(q) ||
      (c.from || '').toLowerCase().includes(q) ||
      (c.to || '').toLowerCase().includes(q) ||
      (c.result || '').toLowerCase().includes(q) ||
      (c.textPlain || '').toLowerCase().includes(q))
  );

  return (
    <div>
      <div className="filter-bar">
        <input
          className="filter-input"
          placeholder="Nach Betreff, Absender, Empfänger oder Text filtern…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <select
          className="filter-select"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="">Alle Typen</option>
          {types.map(t => (
            <option key={t} value={t}>{contactTypeLabel(t)}</option>
          ))}
        </select>
      </div>
      {filtered.map(c => (
        <div key={c.id} className="contact-item">
          <div className="contact-date">{fmt(c.date, 'date')}</div>
          <div className="contact-body">
            <div className="contact-subject">
              {c.subject || '(kein Betreff)'}
              {' '}
              {contactTypeBadge(c.type)}
              {c.attachments > 0 && (
                <span className="badge badge-gray" style={{ marginLeft: 4 }}>
                  {c.attachments} Anhang{c.attachments !== 1 ? 'e' : ''}
                </span>
              )}
            </div>
            {c.from && <div className="contact-meta">Von: {c.from}</div>}
            {c.to && <div className="contact-meta">An: {c.to}</div>}
            {c.cc && <div className="contact-meta">CC: {c.cc}</div>}
            {c.with && !c.from && !c.to && <div className="contact-meta">mit: {c.with}</div>}
            {c.durationMin > 0 && <div className="contact-meta">Dauer: {c.durationMin} Min.</div>}
            {c.result && <div className="contact-text">{c.result}</div>}
            {!c.result && c.textPlain && <div className="contact-text">{c.textPlain}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CustomerDetail() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('persons');
  const [docs, setDocs] = useState(null);
  const [docsError, setDocsError] = useState(null);

  useEffect(() => {
    setCustomer(null);
    setError(null);
    setDocs(null);
    setDocsError(null);
    api.getCustomer(id)
      .then(setCustomer)
      .catch(e => setError(e.message));
    api.getCustomerDocuments(id)
      .then(setDocs)
      .catch(e => setDocsError(e.message));
  }, [id]);

  if (error) return (
    <div className="page">
      <div className="error-box">Fehler: {error}</div>
      <Link to="/">← Zurück zur Suche</Link>
    </div>
  );

  if (!customer) return <div className="loading">Lade Kunde…</div>;

  return (
    <div className="page">
      <div className="breadcrumb">
        <Link to="/">Kunden</Link> › {customer.name}
      </div>

      <div className="customer-header">
        <div>
          <h1>{customer.name}</h1>
          {(customer.street || customer.city) && (
            <div className="address">
              {[customer.street, [customer.zip, customer.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
            </div>
          )}
          <div className="customer-meta">
            {customerStatusBadge(customer.status)}
          </div>
        </div>
        {(customer.notes || customer.remarks) && (
          <div style={{ flex: 1, borderLeft: '1px solid var(--border)', paddingLeft: 24 }}>
            {customer.notes && <div style={{ color: 'var(--text2)', fontSize: '0.88rem' }}>{customer.notes}</div>}
          </div>
        )}
      </div>

      <div className="tabs">
        <button className={'tab' + (tab === 'persons' ? ' active' : '')} onClick={() => setTab('persons')}>
          Personen ({customer.persons?.length || 0})
        </button>

        <button className={'tab' + (tab === 'contracts' ? ' active' : '')} onClick={() => setTab('contracts')}>
          Verträge ({customer.contractCount ?? '…'})
        </button>
        <button className={'tab' + (tab === 'documents' ? ' active' : '')} onClick={() => setTab('documents')}>
          Dokumente {docs != null ? `(${docs.length})` : ''}
        </button>
        <button className={'tab' + (tab === 'contacts' ? ' active' : '')} onClick={() => setTab('contacts')}>
          Korrespondenz ({customer.contactCount ?? '…'})
        </button>
        {customer.contactInfo?.length > 0 && (
          <button className={'tab' + (tab === 'contactinfo' ? ' active' : '')} onClick={() => setTab('contactinfo')}>
            Kontaktdaten ({customer.contactInfo.length})
          </button>
        )}
      </div>

      {tab === 'persons' && <PersonsTab persons={customer.persons} />}
      {tab === 'contracts' && <ContractsTab customerId={id} />}
      {tab === 'contacts' && <ContactsTab customerId={id} />}
      {tab === 'documents' && <DocumentsTab docs={docs} error={docsError} />}
      {tab === 'contactinfo' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Art</th><th>Bezeichnung</th><th>Wert</th></tr>
            </thead>
            <tbody>
              {customer.contactInfo.map(ci => (
                <tr key={ci.id}>
                  <td>{ci.type || '—'}</td>
                  <td>{ci.label || '—'}</td>
                  <td>{ci.value || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
