import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

declare const jsdom: { window: Window };
// Node 26 also defines localStorage; use the actual browser storage in DOM tests.
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: jsdom.window.localStorage,
});

afterEach(cleanup);
window.scrollTo = () => {};
