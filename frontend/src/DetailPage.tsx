import { useI18n } from './i18n';
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
import { formatNumber, formatDate } from './format';

export function DetailPage() {
  const { t } = useI18n();
  const { gtin = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const authorized = params.get('rol') === 'yetkili';
  return (
    <div className="page detail-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={15} />
        {t('allProducts')}
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t('digitalPassportCaps')}</p>
          <h1>
            {t('passport')}
            <span className="heading-dot">.</span>
          </h1>
          <p className="subtitle mono">{gtin}</p>
        </div>
        <span className="passport-badge">
          <Fingerprint size={17} />
          {t('identity')}
        </span>
      </div>
      <div className="role-panel">
        <div>
          <ShieldCheck size={20} />
          <div>
            <strong>{authorized ? t('authorizedView') : t('consumer')}</strong>
            <p>{t('roleWarning')}</p>
          </div>
        </div>
        <label className="role-toggle">
          <span>{t('authorizedDemo')}</span>
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
  const { t, language } = useI18n();
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
          setError(err instanceof Error ? err.message : t('passportFailed'));
      });
    return () => controller.abort();
  }, [gtin, authorized, reload, language, t]);
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
        <Loading label={t('loadingPassport')} />
      ) : (
        <>
          <div className="detail-grid">
            <div>
              <section className="panel detail-information">
                <div className="panel-heading">
                  <div>
                    <h2>{t('moreThanLabel')}</h2>
                    <p>{t('productDetails')}</p>
                  </div>
                  <span className="version">
                    {t('versionShort', {
                      version: formatNumber(data.product.version),
                    })}
                  </span>
                </div>
                <dl className="detail-fields">
                  <div>
                    <dt>{t('model')}</dt>
                    <dd>{data.product.modelName}</dd>
                  </div>
                  <div>
                    <dt>{t('batch')}</dt>
                    <dd>{data.product.batchNumber}</dd>
                  </div>
                  <div>
                    <dt>GTIN</dt>
                    <dd className="mono">{data.product.gtin}</dd>
                  </div>
                  <div>
                    <dt>{t('manufacturingLocation')}</dt>
                    <dd>
                      <MapPin size={16} />
                      {data.product.location}
                    </dd>
                  </div>
                </dl>
                <div className="fiber-section">
                  <h3>{t('composition')}</h3>
                  <Composition
                    cotton={data.product.cotton}
                    elastane={data.product.elastane}
                  />
                </div>
                {authorized && data.product.carbonKgCo2e !== undefined && (
                  <div className="carbon-panel">
                    <span>{t('carbonDemo')}</span>
                    <strong>
                      {formatNumber(data.product.carbonKgCo2e)}{' '}
                      <small>kg CO2e</small>
                    </strong>
                  </div>
                )}
                <div className="updated-label">
                  <Clock3 size={14} />
                  {t('updatedAt', { date: formatDate(data.product.updatedAt) })}
                </div>
              </section>
              <div className="output-links">
                <a
                  href={`${base}?lang=${language}${authorized ? '&rol=yetkili' : ''}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <FileText size={19} />
                  <span>
                    <strong>{t('htmlPassport')}</strong>
                    <small>{t('shareableStory')}</small>
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
                    <strong>{t('jsonLd')}</strong>
                    <small>{t('schemaFormat')}</small>
                  </span>
                  <ArrowUpRight size={17} />
                </a>
              </div>
            </div>
            <aside className="panel qr-panel">
              <div className="qr-heading">
                <QrCode size={19} />
                <span>{t('scanExplore')}</span>
              </div>
              <h2>
                {t('travelsFirst')} <br />
                {t('travelsSecond')}
              </h2>
              <div className="qr-frame">
                {qrError ? (
                  <ErrorMessage message={t('qrFailed')} />
                ) : (
                  <img
                    src={`${base}/qr.png`}
                    alt={t('qrAlt', { name: data.product.modelName })}
                    onError={() => setQrError(true)}
                    width="200"
                    height="200"
                  />
                )}
              </div>
              <p>
                {t('scanConsumer')} <br />
                {t('noApp')}
              </p>
              <a
                className="button primary"
                href={`${base}/qr.png`}
                download={`${gtin}-passport.png`}
              >
                <ArrowDownToLine size={16} />
                {t('downloadPng')}
              </a>
              <small>{t('consumerQr')}</small>
            </aside>
          </div>
          <section className="panel history-panel">
            <div className="panel-heading">
              <div>
                <h2>
                  <History size={19} />
                  {t('history')}{' '}
                  <span className="count-badge">
                    {formatNumber(data.history.length)}
                  </span>
                </h2>
                <p>{t('historyInfo')}</p>
              </div>
            </div>
            <ol className="timeline">
              {data.history.map((snapshot, index) => (
                <li key={snapshot.version}>
                  <span className="timeline-dot" />
                  <div className="timeline-body">
                    <div className="timeline-title">
                      <strong>
                        {t('version', {
                          version: formatNumber(snapshot.version),
                        })}
                      </strong>
                      {index === 0 && (
                        <span className="current-badge">{t('current')}</span>
                      )}
                      <time dateTime={snapshot.updatedAt}>
                        {formatDate(snapshot.updatedAt)}
                      </time>
                    </div>
                    <p>
                      {snapshot.version === 1
                        ? t('passportCreated')
                        : t('dataUpdated')}{' '}
                      · {snapshot.modelName} · {snapshot.batchNumber}
                    </p>
                    <div className="snapshot-details">
                      <span>
                        {t('cotton', { value: formatNumber(snapshot.cotton) })}{' '}
                        /{' '}
                        {t('elastane', {
                          value: formatNumber(snapshot.elastane),
                        })}
                      </span>
                      <span>{snapshot.location}</span>
                      {authorized && snapshot.carbonKgCo2e !== undefined && (
                        <span>
                          {formatNumber(snapshot.carbonKgCo2e)} kg CO2e
                        </span>
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
