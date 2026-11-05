import { formatNumber } from './format';
import { useI18n } from './i18n';
import {
  ArrowDownToLine,
  ArrowRight,
  FileUp,
  Fingerprint,
  MapPin,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from './api';
import type { Passport } from './api';
import { EmptyState, ErrorMessage, Loading, ProductRow } from './components';

export function ProductsPage() {
  const { t, language } = useI18n();
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [products, setProducts] = useState<Passport[] | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api
      .products('', controller.signal)
      .then(setProducts)
      .catch((err: unknown) => {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : t('productsFailed'));
      });
    return () => controller.abort();
  }, [reload, language, t]);
  const filtered = products?.filter(
    (product) =>
      [product.modelName, product.gtin, product.batchNumber, product.location]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (!location || product.location === location),
  );
  const locations = [
    ...new Set(products?.map((product) => product.location) ?? []),
  ].sort();
  const modelCount = new Set(products?.map((product) => product.modelName))
    .size;
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t('connectedData')}</p>
          <h1>
            {t('passports')}
            <span className="heading-dot">.</span>
          </h1>
          <p className="subtitle">{t('productsSubtitle')}</p>
        </div>
        <Link className="button primary" to="/import">
          <FileUp size={17} />
          {t('importCsv')}
        </Link>
      </div>
      <section className="overview-banner">
        <div className="banner-content">
          <span className="banner-tag">
            <span />
            {t('transparencyTag')}
          </span>
          <h2>
            {t('storyFirst')}
            <br />
            {t('storySecond')}
          </h2>
          <p>{t('turnData')}</p>
          <Link to="/import">
            {t('startCsv')} <ArrowRight size={16} />
          </Link>
        </div>
        <div className="passport-art" aria-hidden="true">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-card">
            <div className="art-card-top">
              <Fingerprint size={31} />
              <span>
                {t('digitalProductCaps')}
                <br />
                {t('passportCaps')}
              </span>
            </div>
            <div className="art-lines">
              <i />
              <i />
            </div>
            <div className="art-bars">
              {Array.from({ length: 26 }, (_, i) => (
                <i key={i} style={{ width: `${(i % 3) + 1}px` }} />
              ))}
            </div>
            <div className="art-card-bottom">
              <span>{t('identityCaps')}</span>
              <ShieldCheck size={20} />
            </div>
          </div>
          <span className="art-leaf">
            <ShieldCheck size={23} />
          </span>
        </div>
      </section>
      <section className="stats-grid" aria-label={t('overview')}>
        <div className="stat-card">
          <span className="stat-icon">
            <Fingerprint size={20} />
          </span>
          <div>
            <span className="stat-label">{t('passports')}</span>
            <strong>{products ? formatNumber(products.length) : '—'}</strong>
            <small>{t('uniqueGtins')}</small>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon sage">
            <ArrowDownToLine size={20} />
          </span>
          <div>
            <span className="stat-label">{t('models')}</span>
            <strong>{products ? formatNumber(modelCount) : '—'}</strong>
            <small>{t('connectedBatches')}</small>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon sand">
            <MapPin size={20} />
          </span>
          <div>
            <span className="stat-label">{t('locations')}</span>
            <strong>{products ? formatNumber(locations.length) : '—'}</strong>
            <small>{t('places')}</small>
          </div>
        </div>
      </section>
      <section
        className="panel products-panel"
        aria-labelledby="products-title"
      >
        <div className="panel-heading">
          <div>
            <h2 id="products-title">
              {t('allProducts')}{' '}
              {products && (
                <span className="count-badge">
                  {formatNumber(products.length)}
                </span>
              )}
            </h2>
            <p>{t('exploreProducts')}</p>
          </div>
          <span className="consumer-badge">
            <ShieldCheck size={14} />
            {t('consumer')}
          </span>
        </div>
        <div className="table-toolbar">
          <label className="search-input">
            <Search size={17} />
            <span className="sr-only">{t('searchProducts')}</span>
            <input
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="location-filter">
            <MapPin size={15} />
            <span className="sr-only">{t('productionLocation')}</span>
            <select
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            >
              <option value="">{t('allLocations')}</option>
              {locations.map((place) => (
                <option key={place}>{place}</option>
              ))}
            </select>
          </label>
        </div>
        {error ? (
          <ErrorMessage
            message={error}
            retry={() => {
              setError('');
              setReload((value) => value + 1);
            }}
          />
        ) : products === null ? (
          <Loading />
        ) : products.length === 0 ? (
          <EmptyState title={t('firstPassport')}>
            <p>{t('uploadCollection')}</p>
            <Link className="button primary" to="/import">
              <FileUp size={17} />
              {t('importACsv')}
            </Link>
          </EmptyState>
        ) : filtered?.length === 0 ? (
          <EmptyState title={t('noMatches')}>
            <p>{t('tryFilter')}</p>
            <button
              className="button secondary"
              onClick={() => {
                setSearch('');
                setLocation('');
              }}
            >
              {t('clearFilters')}
            </button>
          </EmptyState>
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t('modelCaps')}</th>
                    <th className="gtin-cell">GTIN</th>
                    <th className="batch-cell">{t('batchCaps')}</th>
                    <th className="location-cell">{t('originCaps')}</th>
                    <th>{t('versionCaps')}</th>
                    <th>
                      <span className="sr-only">{t('openPassport')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered?.map((product) => (
                    <ProductRow key={product.gtin} product={product} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <span>
                {t('showingProducts', {
                  count: formatNumber(filtered?.length ?? 0),
                  total: formatNumber(products.length),
                })}
              </span>
              <span>
                <span className="status-dot" />
                {t('persistentRecords')}
              </span>
            </div>
          </>
        )}
      </section>
      <div className="info-strip">
        <ShieldCheck size={18} />
        <p>{t('consumerInfo')}</p>
      </div>
    </div>
  );
}
