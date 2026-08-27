/**
 * Stub for expo-modules-core/build/web/index.web.
 *
 * See __mocks__/RefsStub.js for context. The jest-expo preset requires this
 * module directly (not via doMock), so we need to provide it via
 * moduleNameMapper.
 *
 * The real module sets up the web platform shims for expo-modules-core. In
 * the test environment we only need the bare minimum that the preset's
 * downstream code reaches for: an empty object with the React Native
 * bridge shims stubbed out.
 */

module.exports = {
  NativeModules: {},
  EventEmitter: function() { return { addListener: () => {}, removeListener: () => {} }; },
  SharedObject: function() { return {}; },
};
