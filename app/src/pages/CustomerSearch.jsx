import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { customerStatusBadge } from '../utils';

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <span className="sort-icon">⇅</span>;
  return <span className="sort-icon active">{sortDir === 'asc' ? '▲' : '▼'}</span>;
}

export default function CustomerSearch() {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const navigate = useNavigate();

  const load = useCallback(async (search) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.searchCustomers(search);
      setCustomers(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(query), query ? 250 : 0);
    return () => clearTimeout(t);
  }, [query, load]);

  function handleSort(col) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  }

  const sorted = [...customers].sort((a, b) => {
    if (!sortCol) return 0;
    let av, bv;
    if (sortCol === 'contracts') {
      av = a.contractCount || 0;
      bv = b.contractCount || 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    }
    if (sortCol === 'status') {
      av = Number(a.status) || 0;
      bv = Number(b.status) || 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    }
    av = (a[sortCol] || '').toLowerCase();
    bv = (b[sortCol] || '').toLowerCase();
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="page">
      <div className="page-header">
        <h1>Kunden</h1>
        <p>{!loading && `${customers.length} Einträge`}</p>
      </div>

      <input
        className="search-box"
        placeholder="Nach Name, Ort oder PLZ suchen…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        autoFocus
      />

      {error && <div className="error-box">Fehler: {error}</div>}

      {loading ? (
        <div className="loading">Lade Daten…</div>
      ) : customers.length === 0 ? (
        <div className="empty">Keine Kunden gefunden.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort('name')}>
                  Name <SortIcon col="name" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className="sortable" onClick={() => handleSort('city')}>
                  Ort <SortIcon col="city" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className="sortable" onClick={() => handleSort('zip')}>
                  PLZ <SortIcon col="zip" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className="sortable" onClick={() => handleSort('status')}>
                  Status <SortIcon col="status" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className="sortable" onClick={() => handleSort('contracts')}>
                  Verträge <SortIcon col="contracts" sortCol={sortCol} sortDir={sortDir} />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(c => (
                <tr
                  key={c.id}
                  className="clickable-row"
                  onClick={() => navigate(`/customers/${c.id}`)}
                >
                  <td>{c.name || '—'}</td>
                  <td>{c.city || '—'}</td>
                  <td>{c.zip || '—'}</td>
                  <td>{customerStatusBadge(c.status)}</td>
                  <td className="text-muted">{c.contractCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
