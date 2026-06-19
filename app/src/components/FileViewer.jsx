import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';

const IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'tif'];

function EmailViewer({ docId }) {
  const [email, setEmail] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setEmail(null);
    setError(null);
    api.getParsedEmail(docId)
      .then(setEmail)
      .catch(e => setError(e.message));
  }, [docId]);

  // Build blob URLs once per parsed email, revoke on change/unmount
  const attachmentUrls = useMemo(() => {
    if (!email?.attachments?.length) return [];
    return email.attachments.map(att => {
      if (!att.data) return null;
      const bytes = atob(att.data);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      return URL.createObjectURL(new Blob([arr], { type: att.contentType }));
    });
  }, [email]);

  useEffect(() => {
    return () => { attachmentUrls.forEach(u => u && URL.revokeObjectURL(u)); };
  }, [attachmentUrls]);

  if (error)  return <div className="doc-viewer-no-preview">Fehler: {error}</div>;
  if (!email) return <div className="doc-viewer-no-preview">Lade…</div>;

  const replyHref = `mailto:${email.from || ''}?subject=Re: ${encodeURIComponent(email.subject || '')}`;
  const forwardHref = `mailto:?subject=Fwd: ${encodeURIComponent(email.subject || '')}&body=${encodeURIComponent((email.bodyText || '').slice(0, 500))}`;

  return (
    <div className="doc-viewer-email">
      <div className="doc-viewer-email-header">
        {email.from    && <div><strong>Von:</strong> {email.from}</div>}
        {email.to      && <div><strong>An:</strong> {email.to}</div>}
        {email.subject && <div><strong>Betreff:</strong> {email.subject}</div>}
        {email.date    && <div><strong>Datum:</strong> {new Date(email.date).toLocaleString('de-DE')}</div>}

        {email.attachments.length > 0 && (
          <div className="doc-viewer-email-attachments">
            {email.attachments.map((att, i) => (
              <a
                key={i}
                href={attachmentUrls[i]}
                download={att.filename}
                className="doc-viewer-email-attachment-chip"
                title={att.contentType}
              >
                📎 {att.filename}
                {att.size > 0 && (
                  <span className="doc-viewer-email-attachment-size">
                    {' '}({Math.round(att.size / 1024)} KB)
                  </span>
                )}
              </a>
            ))}
          </div>
        )}

        <div className="doc-viewer-email-actions">
          <a href={replyHref} className="doc-viewer-email-action-btn">↩ Antworten</a>
          <a href={forwardHref} className="doc-viewer-email-action-btn">→ Weiterleiten</a>
        </div>
      </div>

      {email.bodyHtml
        ? <iframe
            title="E-Mail Inhalt"
            sandbox="allow-same-origin"
            srcDoc={email.bodyHtml}
            className="doc-viewer-email-iframe"
          />
        : <pre className="doc-viewer-email-body">{email.bodyText || '(kein Inhalt)'}</pre>
      }
    </div>
  );
}

export default function FileViewer({ doc, onClose }) {
  if (!doc) return null;

  const ext = (doc.fileType || '').toLowerCase();
  const fileUrl = `/api/documents/${doc.id}/file`;
  const isPdf = ext === 'pdf';
  const isImage = IMAGE_TYPES.includes(ext);
  const isEmail = ext === 'eml';

  return (
    <div className="doc-viewer-pane">
      <div className="doc-viewer-header">
        <h3 title={doc.name || doc.fileType}>{doc.name || `(${doc.fileType})`}</h3>
        <button className="doc-viewer-close" onClick={onClose} title="Schließen">✕</button>
      </div>
      <div className="doc-viewer-body">
        {isPdf && <iframe src={fileUrl} title={doc.name} />}
        {isImage && <img src={fileUrl} alt={doc.name} />}
        {isEmail && <EmailViewer docId={doc.id} />}
        {!isPdf && !isImage && !isEmail && (
          <div className="doc-viewer-no-preview">
            <div style={{ fontSize: '2.5rem' }}>📄</div>
            <div>Keine Vorschau für <strong>.{doc.fileType}</strong></div>
            <a href={fileUrl} download>Datei herunterladen</a>
          </div>
        )}
      </div>
    </div>
  );
}
