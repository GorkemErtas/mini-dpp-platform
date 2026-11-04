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
          setError(
            err instanceof Error ? err.message : 'Could not load products.',
          );
      });
    return () => controller.abort();
  }, [reload]);
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
          <p className="eyebrow">YOUR PRODUCT DATA, CONNECTED</p>
          <h1>
            Product passports<span className="heading-dot">.</span>
          </h1>
          <p className="subtitle">
            A transparent view of every product, from composition to origin.
          </p>
        </div>
        <Link className="button primary" to="/import">
          <FileUp size={17} />
          Import CSV
        </Link>
      </div>
      <section className="overview-banner">
        <div className="banner-content">
          <span className="banner-tag">
            <span />
            MADE FOR TRANSPARENCY
          </span>
          <h2>
            Every product has a story.
            <br />
            Make yours an open book.
          </h2>
          <p>Turn your product data into clear, shareable digital passports.</p>
          <Link to="/import">
            Start with a CSV <ArrowRight size={16} />
          </Link>
        </div>
        <div className="passport-art" aria-hidden="true">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-card">
            <div className="art-card-top">
              <Fingerprint size={31} />
              <span>
                DIGITAL PRODUCT
                <br />
                PASSPORT
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
              <span>PRODUCT IDENTITY</span>
              <ShieldCheck size={20} />
            </div>
          </div>
          <span className="art-leaf">
            <ShieldCheck size={23} />
          </span>
        </div>
      </section>
      <section className="stats-grid" aria-label="Product overview">
        <div className="stat-card">
          <span className="stat-icon">
            <Fingerprint size={20} />
          </span>
          <div>
            <span className="stat-label">Product passports</span>
            <strong>{products ? products.length : '—'}</strong>
            <small>Unique imported GTINs</small>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon sage">
            <ArrowDownToLine size={20} />
          </span>
          <div>
            <span className="stat-label">Product models</span>
            <strong>{products ? modelCount : '—'}</strong>
            <small>Connected to batch records</small>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon sand">
            <MapPin size={20} />
          </span>
          <div>
            <span className="stat-label">Production locations</span>
            <strong>{products ? locations.length : '—'}</strong>
            <small>Places behind your products</small>
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
              All products{' '}
              {products && (
                <span className="count-badge">{products.length}</span>
              )}
            </h2>
            <p>Explore and manage your digital product passports.</p>
          </div>
          <span className="consumer-badge">
            <ShieldCheck size={14} />
            Consumer view
          </span>
        </div>
        <div className="table-toolbar">
          <label className="search-input">
            <Search size={17} />
            <span className="sr-only">Search products</span>
            <input
              placeholder="Search by model, GTIN, batch or location…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="location-filter">
            <MapPin size={15} />
            <span className="sr-only">Production location</span>
            <select
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            >
              <option value="">All locations</option>
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
          <EmptyState title="Your first passport starts here">
            <p>Upload your product CSV to bring your collection to life.</p>
            <Link className="button primary" to="/import">
              <FileUp size={17} />
              Import a CSV
            </Link>
          </EmptyState>
        ) : filtered?.length === 0 ? (
          <EmptyState title="No products match">
            <p>Try another search or production location.</p>
            <button
              className="button secondary"
              onClick={() => {
                setSearch('');
                setLocation('');
              }}
            >
              Clear filters
            </button>
          </EmptyState>
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>PRODUCT MODEL</th>
                    <th className="gtin-cell">GTIN</th>
                    <th className="batch-cell">BATCH</th>
                    <th className="location-cell">ORIGIN</th>
                    <th>VERSION</th>
                    <th>
                      <span className="sr-only">Open passport</span>
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
                Showing {filtered?.length} of {products.length} products
              </span>
              <span>
                <span className="status-dot" />
                Persistent product records
              </span>
            </div>
          </>
        )}
      </section>
      <div className="info-strip">
        <ShieldCheck size={18} />
        <p>
          Consumer passports keep carbon data hidden. Explore the authorized
          demo inside a product passport.
        </p>
      </div>
    </div>
  );
}
