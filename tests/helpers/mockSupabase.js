export function queryResult(result, calls = []) {
  let proxy;
  const target = () => proxy;
  proxy = new Proxy(target, {
    get(_target, property) {
      if (property === 'then') return Promise.resolve(result).then.bind(Promise.resolve(result));
      return (...args) => { calls.push([property, args]); return proxy; };
    },
  });
  return proxy;
}

export function createMockClient({ user = { id: 'user-1' }, tables = {}, auth = {}, storage = {} } = {}) {
  const tableCalls = [];
  return {
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
      ...auth,
    },
    from(table) {
      tableCalls.push(table);
      const configured = tables[table];
      const result = Array.isArray(configured) ? configured.shift() : configured;
      return queryResult(result || { data: [], error: null });
    },
    storage,
    tableCalls,
  };
}

