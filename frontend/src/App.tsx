import { LanguageSwitcher } from './LanguageSwitcher';
import { useI18n } from './i18n';
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
  const { t, language } = useI18n();
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pathname]);
  const section =
    pathname === '/import'
      ? t('csvImport')
      : pathname.startsWith('/products/')
        ? t('passport')
        : pathname === '/'
          ? t('products')
          : t('pageNotFound');
  useEffect(() => {
    document.title = `${section} · Mini DPP`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t('pageDescription'));
  }, [section, language, t]);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        {t('skipContent')}
      </a>
      <aside className="sidebar" aria-label={t('primaryNav')}>
        <Link className="brand" to="/">
          <span className="brand-icon">
            <Fingerprint size={24} />
          </span>
          <span>
            mini<span className="brand-light">dpp</span>
            <small>{t('transparencyCaps')}</small>
          </span>
        </Link>
        <div className="workspace-label">
          <span className="workspace-avatar">E</span>
          <div>
            ESG Next<small>{t('assessmentWorkspace')}</small>
          </div>
          <PanelLeftClose size={16} aria-hidden="true" />
        </div>
        <span className="nav-label">{t('workspaceCaps')}</span>
        <nav>
          <NavLink to="/" end>
            <Package size={19} />
            {t('products')}
          </NavLink>
          <NavLink to="/import">
            <FileUp size={19} />
            {t('csvImport')}
          </NavLink>
        </nav>
        <div className="sidebar-note">
          <div className="note-icon">
            <Leaf size={20} />
          </div>
          <strong>{t('clearStory')}</strong>
          <p>{t('bringData')}</p>
          <Link to="/import">
            {t('createPassport')} <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="sidebar-footer">
          <span className="footer-symbol">
            <Layers3 size={17} />
          </span>
          <div>
            {t('builtTransparency')}
            <small>Mini DPP · ESG Next</small>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <span>{t('workspace')}</span>
            <ChevronRight size={14} />
            <strong>{section}</strong>
          </div>
          <div className="topbar-actions">
            <LanguageSwitcher />
            <a
              className="documentation"
              href="/swagger"
              target="_blank"
              rel="noreferrer"
            >
              <BookOpen size={16} />
              {t('apiDocs')}
              <ArrowUpRight size={13} />
            </a>
          </div>
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
                  <h1>{t('pageNotFound')}</h1>
                  <Link to="/">{t('backProducts')}</Link>
                </div>
              }
            />
          </Routes>
        </main>
        <footer className="page-footer">
          <span>{t('miniPassport')}</span>
          <span>{t('footerMotto')}</span>
        </footer>
      </div>
    </div>
  );
}
