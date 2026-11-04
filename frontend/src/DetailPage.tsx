import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpRight,
  Clock3,
  Code2,
  FileText,
  Fingerprint,
  History,
  MapPin,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, roleQuery } from './api';
import type { Passport } from './api';
import { Composition, ErrorMessage, Loading } from './components';
import { formatDate } from './format';

export function DetailPage() {
  const { gtin = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const authorized = params.get('rol') === 'yetkili';
  return (
    <div className="page detail-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={15} />
        All products
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">DIGITAL PRODUCT PASSPORT</p>
          <h1>
            Product passport
            <span className="heading-dot">.</span>
          </h1>
          <p className="subtitle mono">{gtin}</p>
        </div>
        <span className="passport-badge">
          <Fingerprint size={17} />
          Product identity
        </span>
      </div>
      <div className="role-panel">
        <div>
          <ShieldCheck size={20} />
          <div>
            <strong>
              {authorized ? 'Authorized demo view' : 'Consumer view'}
            </strong>
            <p>
              Demo visibility only. The role parameter is not real
              authorization.
            </p>
          </div>
        </div>
        <label className="role-toggle">
          <span>Authorized demo</span>
          <input
            type="checkbox"
            role="switch"
            checked={authorized}
            onChange={(event) =>
              setParams(event.target.checked ? { rol: 'yetkili' } : {})
            }
          />
          <span className="toggle-track" aria-hidden="true" />
        </label>
      </div>
      {/* Only the data subtree remounts: discard carbon while preserving switch focus. */}
      <DetailContent
        key={`${gtin}:${authorized}`}
        gtin={gtin}
        authorized={authorized}
      />
    </div>
  );
}

function DetailContent({
  gtin,
  authorized,
}: {
  gtin: string;
  authorized: boolean;
}) {
  const [data, setData] = useState<{
    product: Passport;
    history: Passport[];
  } | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [qrError, setQrError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api.product(gtin, authorized, controller.signal),
      api.history(gtin, authorized, controller.signal),
    ])
      .then(([product, history]) => setData({ product, history }))
      .catch((err: unknown) => {
        if (!controller.signal.aborted)
          setError(
            err instanceof Error ? err.message : 'Could not load passport.',
          );
      });
    return () => controller.abort();
  }, [gtin, authorized, reload]);
  const base = `/dpp/${encodeURIComponent(gtin)}`;
  return (
    <>
      {error ? (
        <ErrorMessage
          message={error}
          retry={() => {
            setError('');
            setReload((value) => value + 1);
          }}
        />
      ) : !data ? (
        <Loading label="Loading product passport…" />
      ) : (
        <>
          <div className="detail-grid">
            <div>
              <section className="panel detail-information">
                <div className="panel-heading">
                  <div>
                    <h2>Made of more than a label.</h2>
                    <p>The details behind this product.</p>
                  </div>
                  <span className="version">v{data.product.version}</span>
                </div>
                <dl className="detail-fields">
                  <div>
                    <dt>Product model</dt>
                    <dd>{data.product.modelName}</dd>
                  </div>
                  <div>
                    <dt>Batch number</dt>
                    <dd>{data.product.batchNumber}</dd>
                  </div>
                  <div>
                    <dt>GTIN</dt>
                    <dd className="mono">{data.product.gtin}</dd>
                  </div>
                  <div>
                    <dt>Manufacturing location</dt>
                    <dd>
                      <MapPin size={16} />
                      {data.product.location}
                    </dd>
                  </div>
                </dl>
                <div className="fiber-section">
                  <h3>Fiber composition</h3>
                  <Composition
                    cotton={data.product.cotton}
                    elastane={data.product.elastane}
                  />
                </div>
                {authorized && data.product.carbonKgCo2e !== undefined && (
                  <div className="carbon-panel">
                    <span>Carbon footprint · Authorized demo</span>
                    <strong>
                      {data.product.carbonKgCo2e} <small>kg CO2e</small>
                    </strong>
                  </div>
                )}
                <div className="updated-label">
                  <Clock3 size={14} />
                  Updated {formatDate(data.product.updatedAt)}
                </div>
              </section>
              <div className="output-links">
                <a
                  href={`${base}${roleQuery(authorized)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <FileText size={19} />
                  <span>
                    <strong>HTML passport</strong>
                    <small>The shareable product story</small>
                  </span>
                  <ArrowUpRight size={17} />
                </a>
                <a
                  href={`${base}.jsonld${roleQuery(authorized)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Code2 size={19} />
                  <span>
                    <strong>JSON-LD data</strong>
                    <small>Schema.org Product format</small>
                  </span>
                  <ArrowUpRight size={17} />
                </a>
              </div>
            </div>
            <aside className="panel qr-panel">
              <div className="qr-heading">
                <QrCode size={19} />
                <span>SCAN. EXPLORE. SHARE.</span>
              </div>
              <h2>
                A passport that
                <br />
                travels with the product.
              </h2>
              <div className="qr-frame">
                {qrError ? (
                  <ErrorMessage message="QR preview could not load. Try opening the PNG below." />
                ) : (
                  <img
                    src={`${base}/qr.png`}
                    alt={`QR code for ${data.product.modelName} passport`}
                    onError={() => setQrError(true)}
                    width="200"
                    height="200"
                  />
                )}
              </div>
              <p>
                Scan to open the consumer passport.
                <br />
                No app required.
              </p>
              <a
                className="button primary"
                href={`${base}/qr.png`}
                download={`${gtin}-passport.png`}
              >
                <ArrowDownToLine size={16} />
                Download PNG
              </a>
              <small>QR always links to the consumer view.</small>
            </aside>
          </div>
          <section className="panel history-panel">
            <div className="panel-heading">
              <div>
                <h2>
                  <History size={19} />
                  Version history{' '}
                  <span className="count-badge">{data.history.length}</span>
                </h2>
                <p>
                  A traceable record of every change. Identical imports never
                  create a version.
                </p>
              </div>
            </div>
            <ol className="timeline">
              {data.history.map((snapshot, index) => (
                <li key={snapshot.version}>
                  <span className="timeline-dot" />
                  <div className="timeline-body">
                    <div className="timeline-title">
                      <strong>Version {snapshot.version}</strong>
                      {index === 0 && (
                        <span className="current-badge">Current</span>
                      )}
                      <time dateTime={snapshot.updatedAt}>
                        {formatDate(snapshot.updatedAt)}
                      </time>
                    </div>
                    <p>
                      {snapshot.version === 1
                        ? 'Passport created'
                        : 'Product data updated'}{' '}
                      · {snapshot.modelName} · {snapshot.batchNumber}
                    </p>
                    <div className="snapshot-details">
                      <span>
                        {snapshot.cotton}% cotton / {snapshot.elastane}%
                        elastane
                      </span>
                      <span>{snapshot.location}</span>
                      {authorized && snapshot.carbonKgCo2e !== undefined && (
                        <span>{snapshot.carbonKgCo2e} kg CO2e</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </>
  );
}
