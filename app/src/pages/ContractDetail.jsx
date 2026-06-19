import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { fmt, contractStatusBadge } from '../utils';
import DocumentsTab from '../components/DocumentsTab';

export default function ContractDetail() {
  const { id } = useParams();
  const [contract, setContract] = useState(null);
  const [customerName, setCustomerName] = useState(null);
  const [docs, setDocs] = useState(null);
  const [docsError, setDocsError] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    setContract(null);
    setCustomerName(null);
    setError(null);
    setDocs(null);
    setDocsError(null);
    api.getContract(id)
      .then(c => {
        setContract(c);
        return api.getCustomer(c.customerId);
      })
      .then(customer => setCustomerName(customer.name))
      .catch(e => setError(e.message));
    api.getContractDocuments(id)
      .then(setDocs)
      .catch(e => setDocsError(e.message));
  }, [id]);

  if (error) return (
    <div className="page">
      <div className="error-box">Fehler: {error}</div>
    </div>
  );

  if (!contract) return <div className="loading">Lade Vertrag…</div>;

  return (
    <div className="page">
      <div className="breadcrumb">
        <Link to="/">Kunden</Link>
        {' › '}
        <Link to={`/customers/${contract.customerId}`}>{customerName || 'Kunde'}</Link>
        {' › '}
        {contract.contractNr || `Vertrag ${id}`}
      </div>

      <div className="customer-header">
        <div>
          <h1>{contract.contractNr || '(ohne Nummer)'}</h1>
          <div className="address">{contract.company || '—'}</div>
          <div className="customer-meta">
            {contractStatusBadge(contract.status, contract.active)}
          </div>
        </div>
        <div className="detail-grid" style={{ flex: 1 }}>
          <div className="detail-item">
            <label>Beitrag</label>
            <span>{fmt(contract.premium, 'currency')}</span>
          </div>
          <div className="detail-item">
            <label>Vertragssumme</label>
            <span>{fmt(contract.contractSum, 'currency')}</span>
          </div>
          <div className="detail-item">
            <label>Beginn</label>
            <span>{fmt(contract.startDate, 'date')}</span>
          </div>
          <div className="detail-item">
            <label>Ablauf</label>
            <span>{fmt(contract.endDate, 'date')}</span>
          </div>
          <div className="detail-item">
            <label>Beitrag bis</label>
            <span>{fmt(contract.premiumPayUntil, 'date')}</span>
          </div>
          <div className="detail-item">
            <label>Eingereicht</label>
            <span>{fmt(contract.submittedDate, 'date')}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="detail-grid">
          <div className="detail-item">
            <label>Antragsteller</label>
            <span>{fmt(contract.applicant)}</span>
          </div>
          <div className="detail-item">
            <label>Gesamtrente</label>
            <span>{fmt(contract.totalPension, 'currency')}</span>
          </div>
          <div className="detail-item">
            <label>Saldo</label>
            <span>{fmt(contract.balance, 'currency')}</span>
          </div>
          <div className="detail-item">
            <label>Beitrag (Tarif)</label>
            <span>{fmt(contract.premiumTariff, 'currency')}</span>
          </div>
        </div>
        {contract.notes && (
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Bemerkungen</label>
            <div style={{ color: 'var(--text2)', whiteSpace: 'pre-wrap' }}>{contract.notes}</div>
          </div>
        )}
      </div>

      <div className="tabs">
        <button className="tab active">
          Dokumente {docs != null ? `(${docs.length})` : ''}
        </button>
      </div>

      <DocumentsTab docs={docs} error={docsError} />
    </div>
  );
}
