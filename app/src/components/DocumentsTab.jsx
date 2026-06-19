import { useState } from 'react';
import { fmt } from '../utils';
import FileViewer from './FileViewer';

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <span className="sort-icon">⇅</span>;
  return <span className="sort-icon active">{sortDir === 'asc' ? '▲' : '▼'}</span>;
}

function DocumentsList({ docs, error, selectedDoc, onSelectDoc }) {
  const [filter, setFilter] = useState('');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  if (error) return <div className="error-box">Fehler: {error}</div>;
  if (!docs) return <div className="loading">Lade Dokumente…</div>;
  if (!docs.length) return <div className="empty">Keine Dokumente vorhanden.</div>;

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }

  const q = filter.toLowerCase();
  const filtered = docs.filter(d =>
    !q ||
    (d.name || '').toLowerCase().includes(q) ||
    (d.fileType || '').toLowerCase().includes(q) ||
    (d.category || '').toLowerCase().includes(q)
  );

  const sorted = [...filtered].sort((a, b) => {
    if (!sortCol) return 0;
    if (sortCol === 'date') {
      const av = new Date(a.date || 0), bv = new Date(b.date || 0);
      return sortDir === 'asc' ? av - bv : bv - av;
    }
    if (sortCol === 'pages' || sortCol === 'fileSize') {
      const av = Number(a[sortCol]) || 0, bv = Number(b[sortCol]) || 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    }
    const av = (a[sortCol] || '').toLowerCase();
    const bv = (b[sortCol] || '').toLowerCase();
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div>
      <div className="filter-bar">
        <input
          className="filter-input"
          placeholder="Nach Bezeichnung, Typ oder Kategorie filtern…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSort('date')}>
                Datum <SortIcon col="date" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className="sortable" onClick={() => handleSort('name')}>
                Bezeichnung <SortIcon col="name" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className="sortable" onClick={() => handleSort('fileType')}>
                Typ <SortIcon col="fileType" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className="sortable" onClick={() => handleSort('category')}>
                Kategorie <SortIcon col="category" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className="sortable" onClick={() => handleSort('pages')}>
                Seiten <SortIcon col="pages" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className="sortable" onClick={() => handleSort('fileSize')}>
                Größe <SortIcon col="fileSize" sortCol={sortCol} sortDir={sortDir} />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(d => (
              <tr
                key={d.id}
                className={'clickable-row' + (selectedDoc?.id === d.id ? ' selected' : '')}
                onClick={() => onSelectDoc(selectedDoc?.id === d.id ? null : d)}
              >
                <td className="nowrap">{fmt(d.date, 'date')}</td>
                <td>{d.name || '—'}</td>
                <td>{d.fileType || '—'}</td>
                <td>{d.category || '—'}</td>
                <td>{d.pages || '—'}</td>
                <td className="nowrap">
                  {d.fileSize ? `${Math.round(d.fileSize / 1024)} KB` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Renders the full documents panel: list + optional preview pane
export default function DocumentsTab({ docs, error }) {
  const [selectedDoc, setSelectedDoc] = useState(null);

  return (
    <div className={selectedDoc ? 'doc-split' : ''}>
      <div className={selectedDoc ? 'doc-list-pane' : ''}>
        <DocumentsList
          docs={docs}
          error={error}
          selectedDoc={selectedDoc}
          onSelectDoc={setSelectedDoc}
        />
      </div>
      {selectedDoc && (
        <FileViewer doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
      )}
    </div>
  );
}
