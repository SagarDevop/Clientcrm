import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock Notification API
globalThis.Notification = class Notification {
  static permission = 'default';
  static requestPermission = async () => Notification.permission;
  constructor(title, options) {
    this.title = title;
    this.options = options;
  }
};

// Mock navigator.storage
if (!navigator.storage) {
  navigator.storage = {
    estimate: async () => ({ quota: 1000000000, usage: 50000 }),
    persisted: async () => true,
    persist: async () => true,
  };
}
