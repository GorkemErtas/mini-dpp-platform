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
      setError('Choose a .csv file. Other file formats are not supported.');
      return;
    }
    if (selected.size > 2 * 1024 * 1024 || selected.size === 0) {
      setFile(null);
      setError('Choose a nonempty CSV file no larger than 2 MiB.');
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
      setError(
        err instanceof Error ? err.message : 'Import failed. Please retry.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page import-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">FROM SPREADSHEET TO PASSPORT</p>
          <h1>
            Import product data<span className="heading-dot">.</span>
          </h1>
          <p className="subtitle">
            One CSV. Clear validation. A passport for every valid product.
          </p>
        </div>
      </div>
      <div className="import-layout">
        <section className="panel upload-panel">
          <div className="panel-heading">
            <div>
              <h2>Upload your CSV</h2>
              <p>Valid rows are saved even when other rows need attention.</p>
            </div>
            <span className="step-label">01 / UPLOAD</span>
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
              <h3>Drop your product CSV here</h3>
              <p>or choose a file from your computer</p>
              <label
                className={`button secondary file-label ${busy ? 'disabled' : ''}`}
              >
                Choose CSV file
                <input
                  ref={input}
                  className="file-input"
                  type="file"
                  accept=".csv,text/csv"
                  aria-label="Choose CSV file"
                  disabled={busy}
                  onChange={(event) => {
                    chooseFile(event.target.files?.[0]);
                    event.target.value = '';
                  }}
                />
              </label>
              <small>UTF-8 CSV · Up to 2 MiB · 10,000 rows</small>
            </div>
            {file && (
              <div className="selected-file">
                <FileSpreadsheet size={23} />
                <div>
                  <strong>{file.name}</strong>
                  <span>
                    {(file.size / 1024).toFixed(1)} KB · Ready to validate
                  </span>
                </div>
                <button
                  type="button"
                  className="icon-link"
                  aria-label="Remove selected file"
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
                Existing GTINs update safely
              </span>
              <button
                className="button primary"
                disabled={!file || busy}
                type="submit"
              >
                {busy ? (
                  <>
                    <LoaderCircle className="spin" size={17} />
                    Importing…
                  </>
                ) : (
                  <>
                    <FileUp size={17} />
                    Validate & import
                  </>
                )}
              </button>
            </div>
            {busy && (
              <p className="upload-progress" role="status">
                Validating records and saving valid rows. Please wait…
              </p>
            )}
          </form>
        </section>
        <aside className="import-guide">
          <div className="guide-icon">
            <Info size={23} />
          </div>
          <h2>
            A little preparation
            <br />
            goes a long way.
          </h2>
          <p>
            Keep the original CSV format so product identifiers stay intact.
          </p>
          <ul>
            <li>
              <CheckCircle2 size={17} />
              <span>GTINs need 14 digits and a valid GS1 check digit.</span>
            </li>
            <li>
              <CheckCircle2 size={17} />
              <span>Cotton and elastane percentages must add up to 100.</span>
            </li>
            <li>
              <CheckCircle2 size={17} />
              <span>Use a dot for decimal numbers, such as 12.4.</span>
            </li>
            <li>
              <CheckCircle2 size={17} />
              <span>
                Include model, batch, production location and nonnegative carbon
                data.
              </span>
            </li>
          </ul>
          <div className="guide-note">
            Avoid opening and resaving the CSV in Excel: leading zeros can be
            lost.
          </div>
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
                Import complete
              </h2>
              <p>
                {report.total} data rows checked. Header is CSV row 1; blank
                lines are skipped.
              </p>
            </div>
            <Link to="/" className="button secondary">
              View products
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="result-grid" role="status">
            {(
              [
                ['Imported', report.imported],
                ['Updated', report.updated],
                ['Unchanged', report.unchanged],
                ['Rejected', report.failed],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className={label === 'Rejected' && value > 0 ? 'rejected' : ''}
              >
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          {report.errors.length > 0 && (
            <div className="row-errors">
              <h3>Rows that need attention</h3>
              <p>
                These records were not saved. Correct them and upload the file
                again.
              </p>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>CSV ROW</th>
                      <th>FIELD</th>
                      <th>WHAT TO FIX</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.errors.flatMap((row) =>
                      row.errors.map((issue, index) => (
                        <tr key={`${row.row}-${index}`}>
                          <td>
                            <span className="row-badge">Row {row.row}</span>
                          </td>
                          <td>
                            <code>{issue.field}</code>
                          </td>
                          <td>{issue.message}</td>
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
            Identical rows are unchanged. Only real changes create a new
            version.
          </div>
        </section>
      )}
    </div>
  );
}
