// Jest setup file — runs before each test file.
// Provides global mocks for native modules that aren't available in the Jest
// environment, and brings in @testing-library/jest-native matchers.

require('@testing-library/jest-native/extend-expect');

// Mock @expo/vector-icons so we can render components that use Ionicons
// without pulling in the full expo-font / expo-modules-core native bridge.
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const makeIcon = (name) => {
    const Mock = React.forwardRef((props, ref) => {
      const { size = 24, color = '#000', style } = props || {};
      return React.createElement(Text, {
        ref,
        style: [{ fontSize: size, color }, style],
        children: '•', // single dot so icon containers have measurable content
        testID: `icon-${name}`,
      });
    });
    Mock.displayName = name;
    return Mock;
  };
  return new Proxy({}, {
    get: (_target, prop) => {
      if (prop === '__esModule') return true;
      return makeIcon(String(prop));
    },
  });
});

// Mock react-native-reanimated. Without this, importing components that use
// reanimated (e.g. via expo-router) throws in the Jest environment.
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock expo-haptics so tests don't try to invoke the native bridge.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// Mock expo-linear-gradient.
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  const LinearGradient = React.forwardRef((props, ref) => {
    const { children, ...rest } = props;
    return React.createElement(View, { ...rest, ref }, children);
  });
  LinearGradient.displayName = 'LinearGradient';
  return { LinearGradient };
});

// Mock expo-camera so tests can render the scanner screen without a device.
jest.mock('expo-camera', () => ({
  Camera: function MockCamera() { return null; },
  CameraView: function MockCameraView() { return null; },
  useCameraPermissions: () => [{ status: 'granted', canAskAgain: true }, jest.fn()],
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  Constants: { Type: { back: 'back', front: 'front' } },
}));

// Mock @react-native-async-storage/async-storage with a simple in-memory map.
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return {
    getItem: jest.fn(async (key) => store.get(key) ?? null),
    setItem: jest.fn(async (key, value) => { store.set(key, String(value)); }),
    removeItem: jest.fn(async (key) => { store.delete(key); }),
    clear: jest.fn(async () => { store.clear(); }),
    getAllKeys: jest.fn(async () => Array.from(store.keys())),
    multiGet: jest.fn(async (keys) => keys.map(k => [k, store.get(k) ?? null])),
    multiSet: jest.fn(async (entries) => { entries.forEach(([k, v]) => store.set(k, String(v))); }),
    multiRemove: jest.fn(async (keys) => { keys.forEach(k => store.delete(k)); }),
  };
});

// Mock expo-sqlite so the database layer can be unit tested in-memory.
jest.mock('expo-sqlite', () => {
  const mockDb = {
    execSync: jest.fn(),
    runSync: jest.fn(() => ({ changes: 0, lastInsertRowId: 1 })),
    getFirstSync: jest.fn(() => null),
    getAllSync: jest.fn(() => []),
    prepareSync: jest.fn(() => ({
      executeSync: jest.fn(() => ({ changes: 0, lastInsertRowId: 1 })),
      getColumnNames: jest.fn(() => []),
      reset: jest.fn(),
      finalize: jest.fn(),
    })),
    closeSync: jest.fn(),
    withTransactionSync: jest.fn((fn) => fn()),
  };
  return {
    openDatabaseSync: jest.fn(() => mockDb),
    SQLiteProvider: function MockProvider({ children }) { return children; },
    useSQLiteContext: () => mockDb,
  };
});

// Silence console.warn from React Native during tests (e.g. Animated: `useNativeDriver`).
const originalWarn = console.warn;
console.warn = (...args) => {
  const msg = args[0]?.toString?.() ?? '';
  if (msg.includes('useNativeDriver') || msg.includes('Animated')) return;
  originalWarn(...args);
};

// Increase default timeout for slow CI environments.
jest.setTimeout(15000);
