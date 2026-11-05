import { formatNumber } from './format';
import { useI18n } from './i18n';
import {
  AlertCircle,
  ArrowUpRight,
  LoaderCircle,
  PackageOpen,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Passport } from './api';

export function Loading({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="state" role="status">
      <LoaderCircle className="spin" size={25} />
      <p>{label ?? t('loadingPassports')}</p>
    </div>
  );
}

export function ErrorMessage({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  const { t, localizeMessage } = useI18n();
  return (
    <div className="error-message" role="alert">
      <AlertCircle size={20} />
      <div>
        <strong>{t('attention')}</strong>
        <p>{localizeMessage(message)}</p>
        {retry && (
          <button className="text-button" onClick={retry}>
            {t('tryAgain')}
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="state empty">
      <div className="empty-icon">
        <PackageOpen size={28} />
      </div>
      <h2>{title}</h2>
      {children}
    </div>
  );
}

export function Composition({
  cotton,
  elastane,
}: {
  cotton: number;
  elastane: number;
}) {
  const { t } = useI18n();
  return (
    <div className="composition">
      <div
        className="composition-bar"
        role="img"
        aria-label={t('compositionLabel', {
          cotton: formatNumber(cotton),
          elastane: formatNumber(elastane),
        })}
      >
        <span style={{ width: `${cotton}%` }} />
        <span style={{ width: `${elastane}%` }} />
      </div>
      <div className="composition-labels">
        <span>
          <i />
          {t('cotton', { value: formatNumber(cotton) })}
        </span>
        <span>
          <i />
          {t('elastane', { value: formatNumber(elastane) })}
        </span>
      </div>
    </div>
  );
}

export function ProductRow({ product }: { product: Passport }) {
  const { t } = useI18n();
  return (
    <tr>
      <td>
        <div className="product-name">
          <div className="product-mark" aria-hidden="true">
            {product.modelName.slice(0, 1)}
          </div>
          <div>
            <Link className="name-link" to={`/products/${product.gtin}`}>
              {product.modelName}
            </Link>
            <span className="mobile-batch">{product.batchNumber}</span>
          </div>
        </div>
      </td>
      <td className="mono gtin-cell">{product.gtin}</td>
      <td className="batch-cell">{product.batchNumber}</td>
      <td className="location-cell">{product.location}</td>
      <td>
        <span className="version">
          {t('versionShort', { version: formatNumber(product.version) })}
        </span>
      </td>
      <td>
        <Link
          to={`/products/${product.gtin}`}
          className="icon-link"
          aria-label={t('openNamedPassport', { name: product.modelName })}
        >
          <ArrowUpRight size={19} />
        </Link>
      </td>
    </tr>
  );
}
