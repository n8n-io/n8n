const currentFetch = global.fetch;
Object.defineProperty(global, 'fetch', { writable: true, value: currentFetch });
