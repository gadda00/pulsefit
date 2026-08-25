/**
 * Stub for expo-modules-core/build/Refs.
 *
 * The published `expo-modules-core` package ships TypeScript declaration
 * files (`.d.ts`) but no compiled JavaScript (`.js`) for the `Refs` module.
 * Jest's `jest-expo` preset calls `jest.doMock('expo-modules-core/build/Refs')`
 * at setup time, and Jest's resolver fails because no `.js` file exists at
 * that path.
 *
 * This stub provides the minimal shape the preset expects so the resolver is
 * satisfied. The values are deliberately no-ops / empty factories.
 */

module.exports = {
  createSnapshotFriendlyRef: (initial = null) => ({
    current: initial,
    toJSON: () => '[React.ref]',
  }),
  createRef: (initial = null) => ({ current: initial }),
};
