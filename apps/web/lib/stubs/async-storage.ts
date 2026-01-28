// Web stub: prevents bundler resolution errors from RN-only AsyncStorage.
// Not used at runtime in AnimaSaga.
const AsyncStorage = {
  getItem: async (_key: string) => null,
  setItem: async (_key: string, _value: string) => {},
  removeItem: async (_key: string) => {},
  clear: async () => {},
  getAllKeys: async () => [],
  multiGet: async (_keys: string[]) => [],
  multiSet: async (_kvPairs: Array<[string, string]>) => {},
  multiRemove: async (_keys: string[]) => {},
};

export default AsyncStorage;
export { AsyncStorage };
