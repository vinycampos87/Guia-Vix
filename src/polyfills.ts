/**
 * Polyfill for matchMedia which is sometimes missing or broken in some environments.
 * This must be imported before any other code that might use matchMedia.
 */
if (typeof window !== 'undefined') {
  // matchMedia polyfill
  const originalMatchMedia = window.matchMedia;
  
  const polyfillMql = (mql: any, query: string) => {
    if (!mql || typeof mql !== 'object') {
      mql = {
        matches: false,
        media: query || '',
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
    }
    if (mql && typeof mql === 'object') {
      if (!mql.addListener) mql.addListener = () => {};
      if (!mql.removeListener) mql.removeListener = () => {};
      if (!mql.addEventListener) mql.addEventListener = () => {};
      if (!mql.removeEventListener) mql.removeEventListener = () => {};
    }
    return mql;
  };

  // @ts-ignore
  window.matchMedia = function(query: string) {
    let mql: any = null;
    try {
      mql = originalMatchMedia ? originalMatchMedia.call(window, query) : null;
    } catch (e) {
      mql = null;
    }
    return polyfillMql(mql, query);
  };

  // @ts-ignore
  document.matchMedia = window.matchMedia;

  // Add listener to prototypes for maximum compatibility
  [
    (window as any).MediaQueryList,
    (window as any).VisualViewport,
    (window as any).ScreenOrientation
  ].forEach(ctor => {
    if (ctor && ctor.prototype) {
      if (!ctor.prototype.addListener) ctor.prototype.addListener = function() {};
      if (!ctor.prototype.removeListener) ctor.prototype.removeListener = function() {};
      if (!ctor.prototype.addEventListener) ctor.prototype.addEventListener = function() {};
      if (!ctor.prototype.removeEventListener) ctor.prototype.removeEventListener = function() {};
    }
  });

  // screen.orientation polyfill
  if (window.screen && !window.screen.orientation) {
    (window.screen as any).orientation = {
      type: 'landscape-primary',
      angle: 0,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      lock: () => Promise.resolve(),
      unlock: () => {},
    };
  }

  // visualViewport polyfill
  if (!window.visualViewport) {
    (window as any).visualViewport = {
      offsetLeft: 0,
      offsetTop: 0,
      pageLeft: 0,
      pageTop: 0,
      width: window.innerWidth,
      height: window.innerHeight,
      scale: 1,
      onresize: null,
      onscroll: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    };
  }

  // Silent MetaMask / Ethereum provider safety
  // If the provider exists but is broken or missing, provide a non-throwing silent mock
  const isBroken = (window as any).ethereum && typeof (window as any).ethereum !== 'object';
  if (!(window as any).ethereum || isBroken) {
    (window as any).ethereum = {
      isMetaMask: false,
      request: async () => [], 
      on: () => {},
      removeListener: () => {},
      autoRefreshOnNetworkChange: false,
      enable: async () => [],
      send: () => {},
      sendAsync: () => {}
    };
  }

  // console.error polyfill to handle circular structures
  const originalError = console.error;
  const originalLog = console.log;

  const safeArg = (arg: any) => {
    if (typeof arg === 'object' && arg !== null) {
      const cache = new Set();
      const replacer = (_key: string, value: any) => {
        if (typeof value === 'object' && value !== null) {
          if (cache.has(value)) return '[Circular]';
          cache.add(value);
          if (value instanceof Node) return `[DOM Element: ${value.nodeName}]`;
          if (value === window) return '[Window]';
          if (value === document) return '[Document]';
        }
        return value;
      };
      try {
        // Create a non-circular version for logging
        return JSON.parse(JSON.stringify(arg, replacer));
      } catch (e) {
        try {
          return String(arg);
        } catch (err) {
          return '[Unstringifiable Object]';
        }
      }
    }
    return arg;
  };

  console.error = (...args: any[]) => {
    originalError.apply(console, args.map(safeArg));
  };

  console.log = (...args: any[]) => {
    originalLog.apply(console, args.map(safeArg));
  };
}

export {};
