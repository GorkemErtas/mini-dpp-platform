import {
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  FileUp,
  Fingerprint,
  Layers3,
  Leaf,
  Package,
  PanelLeftClose,
} from 'lucide-react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { ProductsPage } from './ProductsPage';
import { ImportPage } from './ImportPage';
import { DetailPage } from './DetailPage';

export function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pathname]);
  const section =
    pathname === '/import'
      ? 'CSV import'
      : pathname.startsWith('/products/')
        ? 'Product passport'
        : 'Products';
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar" aria-label="Primary navigation">
        <Link className="brand" to="/">
          <span className="brand-icon">
            <Fingerprint size={24} />
          </span>
          <span>
            mini<span className="brand-light">dpp</span>
            <small>PRODUCT TRANSPARENCY</small>
          </span>
        </Link>
        <div className="workspace-label">
          <span className="workspace-avatar">E</span>
          <div>
            ESG Next<small>Assessment workspace</small>
          </div>
          <PanelLeftClose size={16} aria-hidden="true" />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          <NavLink to="/" end>
            <Package size={19} />
            Products
          </NavLink>
          <NavLink to="/import">
            <FileUp size={19} />
            CSV import
          </NavLink>
        </nav>
        <div className="sidebar-note">
          <div className="note-icon">
            <Leaf size={20} />
          </div>
          <strong>A clearer product story.</strong>
          <p>
            Bring product data together. Make it easy to understand and share.
          </p>
          <Link to="/import">
            Create a passport <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="sidebar-footer">
          <span className="footer-symbol">
            <Layers3 size={17} />
          </span>
          <div>
            Built for transparency<small>Mini DPP · ESG Next</small>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{section}</strong>
          </div>
          <a
            className="documentation"
            href="/swagger"
            target="_blank"
            rel="noreferrer"
          >
            <BookOpen size={16} />
            API documentation
            <ArrowUpRight size={13} />
          </a>
        </header>
        <main id="main" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<ProductsPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/products/:gtin" element={<DetailPage />} />
            <Route
              path="*"
              element={
                <div className="page">
                  <h1>Page not found</h1>
                  <Link to="/">Back to products</Link>
                </div>
              }
            />
          </Routes>
        </main>
        <footer className="page-footer">
          <span>Mini Digital Product Passport</span>
          <span>Thoughtful data. Transparent products.</span>
        </footer>
      </div>
    </div>
  );
}
