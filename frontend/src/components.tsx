import {
  AlertCircle,
  ArrowUpRight,
  LoaderCircle,
  PackageOpen,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Passport } from './api';

export function Loading({ label = 'Loading passports…' }: { label?: string }) {
  return (
    <div className="state" role="status">
      <LoaderCircle className="spin" size={25} />
      <p>{label}</p>
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
  return (
    <div className="error-message" role="alert">
      <AlertCircle size={20} />
      <div>
        <strong>Something needs attention</strong>
        <p>{message}</p>
        {retry && (
          <button className="text-button" onClick={retry}>
            Try again
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
  return (
    <div className="composition">
      <div
        className="composition-bar"
        role="img"
        aria-label={`${cotton}% cotton, ${elastane}% elastane`}
      >
        <span style={{ width: `${cotton}%` }} />
        <span style={{ width: `${elastane}%` }} />
      </div>
      <div className="composition-labels">
        <span>
          <i />
          {cotton}% cotton
        </span>
        <span>
          <i />
          {elastane}% elastane
        </span>
      </div>
    </div>
  );
}

export function ProductRow({ product }: { product: Passport }) {
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
        <span className="version">v{product.version}</span>
      </td>
      <td>
        <Link
          to={`/products/${product.gtin}`}
          className="icon-link"
          aria-label={`Open ${product.modelName} passport`}
        >
          <ArrowUpRight size={19} />
        </Link>
      </td>
    </tr>
  );
}
