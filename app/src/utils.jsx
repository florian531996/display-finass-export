export function fmt(val, type = 'text') {
  if (val == null || val === '') return '—';
  if (type === 'date') {
    const d = new Date(val);
    if (isNaN(d)) return String(val);
    return d.toLocaleDateString('de-DE');
  }
  if (type === 'currency') {
    return Number(val).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
  }
  if (type === 'bool') return val ? 'Ja' : 'Nein';
  return String(val);
}

export function contractStatusBadge(status, active) {
  if (active === false || active === 0) return <span className="badge badge-gray">Inaktiv</span>;
  const s = Number(status);
  if (s === 1) return <span className="badge badge-green">Aktiv</span>;
  if (s === 2) return <span className="badge badge-orange">Beantragt</span>;
  if (s === 3) return <span className="badge badge-red">Storniert</span>;
  return <span className="badge badge-blue">Status {s}</span>;
}

export function customerStatusBadge(status) {
  const s = Number(status);
  if (s === 4) return <span className="badge badge-green">Kunde</span>;
  if (s === 5) return <span className="badge badge-blue">Interessent</span>;
  if (s === 2) return <span className="badge badge-gray">Inaktiv</span>;
  return <span className="badge badge-gray">Status {s}</span>;
}

export function contactTypeLabel(type) {
  if (!type) return type;
  const medium = { E: 'E-Mail', T: 'Telefon', P: 'Persönlich', B: 'Brief', F: 'Fax' };
  const dir    = { A: 'Ausgang', E: 'Eingang' };
  const m = medium[type[0]] ?? type;
  const d = dir[type[1]];
  return d ? `${m} ${d}` : m;
}

export function contactTypeBadge(type) {
  if (!type) return null;
  const color = { E: 'badge-blue', T: 'badge-green', P: 'badge-orange', B: 'badge-gray', F: 'badge-gray' };
  const dir   = { A: '↑', E: '↓' };
  const label = contactTypeLabel(type);
  const arrow = dir[type[1]] ?? '';
  const cls   = color[type[0]] ?? 'badge-blue';
  return <span className={`badge ${cls}`}>{label.replace(/ (Eingang|Ausgang)$/, '')}{arrow && ` ${arrow}`}</span>;
}
