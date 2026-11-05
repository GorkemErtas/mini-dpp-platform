import { formatNumber } from './format';
import { useI18n } from './i18n';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  FileUp,
  Info,
  LoaderCircle,
  RefreshCw,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from './api';
import type { ImportReport } from './api';
import { ErrorMessage } from './components';

export function ImportPage() {
  const { t, localizeMessage } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<ImportReport | null>(null);
  const input = useRef<HTMLInputElement>(null);
  function chooseFile(selected?: File) {
    if (!selected) return;
    setReport(null);
    if (!selected.name.toLowerCase().endsWith('.csv')) {
      setFile(null);
      setError(t('chooseCsvError'));
      return;
    }
    if (selected.size > 2 * 1024 * 1024 || selected.size === 0) {
      setFile(null);
      setError(t('fileSizeError'));
      return;
    }
    setError('');
    setFile(selected);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setError('');
    setReport(null);
    try {
      setReport(await api.import(file));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('importFailed'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page import-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t('spreadsheetPassport')}</p>
          <h1>
            {t('importData')}
            <span className="heading-dot">.</span>
          </h1>
          <p className="subtitle">{t('importSubtitle')}</p>
        </div>
      </div>
      <div className="import-layout">
        <section className="panel upload-panel">
          <div className="panel-heading">
            <div>
              <h2>{t('uploadCsv')}</h2>
              <p>{t('validRowsSaved')}</p>
            </div>
            <span className="step-label">{t('uploadStep')}</span>
          </div>
          <form onSubmit={submit}>
            <div
              className={`dropzone ${dragging ? 'dragging' : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                if (!busy) setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                if (!busy) chooseFile(event.dataTransfer.files[0]);
              }}
            >
              <div className="upload-icon">
                <FileUp size={28} />
              </div>
              <h3>{t('dropCsv')}</h3>
              <p>{t('chooseComputer')}</p>
              <label
                className={`button secondary file-label ${busy ? 'disabled' : ''}`}
              >
                {t('chooseCsv')}
                <input
                  ref={input}
                  className="file-input"
                  type="file"
                  accept=".csv,text/csv"
                  aria-label={t('chooseCsv')}
                  disabled={busy}
                  onChange={(event) => {
                    chooseFile(event.target.files?.[0]);
                    event.target.value = '';
                  }}
                />
              </label>
              <small>{t('uploadLimits')}</small>
            </div>
            {file && (
              <div className="selected-file">
                <FileSpreadsheet size={23} />
                <div>
                  <strong>{file.name}</strong>
                  <span>
                    {t('fileReady', {
                      size: formatNumber(file.size / 1024, 1),
                    })}
                  </span>
                </div>
                <button
                  type="button"
                  className="icon-link"
                  aria-label={t('removeFile')}
                  disabled={busy}
                  onClick={() => {
                    setFile(null);
                    setReport(null);
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            )}
            {error && <ErrorMessage message={error} />}
            <div className="upload-actions">
              <span>
                <Check size={15} />
                {t('safeUpdates')}
              </span>
              <button
                className="button primary"
                disabled={!file || busy}
                type="submit"
              >
                {busy ? (
                  <>
                    <LoaderCircle className="spin" size={17} />
                    {t('importing')}
                  </>
                ) : (
                  <>
                    <FileUp size={17} />
                    {t('validateImport')}
                  </>
                )}
              </button>
            </div>
            {busy && (
              <p className="upload-progress" role="status">
                {t('importProgress')}
              </p>
            )}
          </form>
        </section>
        <aside className="import-guide">
          <div className="guide-icon">
            <Info size={23} />
          </div>
          <h2>
            {t('preparationFirst')} <br />
            {t('preparationSecond')}
          </h2>
          <p>{t('keepCsvFormat')}</p>
          <ul>
            <li>
              <CheckCircle2 size={17} />
              <span>{t('gtinGuide')}</span>
            </li>
            <li>
              <CheckCircle2 size={17} />
              <span>{t('compositionGuide')}</span>
            </li>
            <li>
              <CheckCircle2 size={17} />
              <span>{t('decimalGuide')}</span>
            </li>
            <li>
              <CheckCircle2 size={17} />
              <span>{t('requiredGuide')}</span>
            </li>
          </ul>
          <div className="guide-note">{t('excelWarning')}</div>
        </aside>
      </div>
      {report && (
        <section
          className="panel import-results"
          aria-labelledby="result-title"
        >
          <div className="panel-heading">
            <div>
              <h2 id="result-title">
                <CheckCircle2 size={20} />
                {t('importComplete')}
              </h2>
              <p>{t('checkedRows', { total: formatNumber(report.total) })}</p>
            </div>
            <Link to="/" className="button secondary">
              {t('viewProducts')}
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="result-grid" role="status">
            {(
              [
                ['imported', report.imported],
                ['updated', report.updated],
                ['unchanged', report.unchanged],
                ['rejected', report.failed],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className={label === 'rejected' && value > 0 ? 'rejected' : ''}
              >
                <strong>{formatNumber(value)}</strong>
                <span>{t(label)}</span>
              </div>
            ))}
          </div>
          {report.errors.length > 0 && (
            <div className="row-errors">
              <h3>{t('rowsAttention')}</h3>
              <p>{t('rowsNotSaved')}</p>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{t('csvRowCaps')}</th>
                      <th>{t('fieldCaps')}</th>
                      <th>{t('fixCaps')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.errors.flatMap((row) =>
                      row.errors.map((issue, index) => (
                        <tr key={`${row.row}-${index}`}>
                          <td>
                            <span className="row-badge">
                              {t('row', { row: formatNumber(row.row) })}
                            </span>
                          </td>
                          <td>
                            <code>{issue.field}</code>
                          </td>
                          <td>{localizeMessage(issue.message)}</td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="result-footer">
            <RefreshCw size={15} />
            {t('noOpInfo')}
          </div>
        </section>
      )}
    </div>
  );
}
