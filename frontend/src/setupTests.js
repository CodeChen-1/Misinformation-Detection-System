// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// jsPDF requires TextEncoder which isn't available in Jest's jsdom
// environment by default — polyfill it before any imports can trigger it.
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// d3 uses ESM which Jest cannot parse — mock it globally so any
// component importing d3 (e.g. DataExplorer) still compiles in tests.
jest.mock('d3', () => ({
  select: jest.fn(() => ({ append: jest.fn(() => ({ attr: jest.fn(() => ({ style: jest.fn(() => ({ text: jest.fn() })) })) })) })),
  scaleLinear: jest.fn(() => ({ domain: jest.fn(() => ({ range: jest.fn(() => ({ nice: jest.fn() })) })) })),
  scaleOrdinal: jest.fn(() => ({ domain: jest.fn(() => ({ range: jest.fn() })) })),
  axisBottom: jest.fn(),
  axisLeft: jest.fn(),
  max: jest.fn(),
  min: jest.fn(),
  sum: jest.fn(),
  mean: jest.fn(),
  extent: jest.fn(() => [0, 1]),
  csv: jest.fn(),
  json: jest.fn(),
}));

// Prevent jsPDF from actually running during tests (avoids canvas/CORS crashes).
jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
    addImage: jest.fn(),
    addPage: jest.fn(),
    save: jest.fn(),
  }));
});

jest.mock('html2canvas', () => jest.fn(() => Promise.resolve({ toDataURL: () => 'data:image/png;base64,' })));
