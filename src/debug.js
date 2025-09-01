// Debug helper to trace initialization errors
window.DEBUG_RACING_SIM = true;

window.addEventListener('error', (event) => {
  console.error('Global error caught:', {
    message: event.message,
    source: event.filename,
    line: event.lineno,
    column: event.colno,
    error: event.error
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', {
    reason: event.reason,
    promise: event.promise
  });
});

// Trace module loading
export function debugLog(module, message, data = null) {
  if (window.DEBUG_RACING_SIM) {
    console.log(`[${module}] ${message}`, data || '');
  }
}

// Wrap async functions to catch errors
export function wrapAsync(fn, moduleName) {
  return async function(...args) {
    try {
      debugLog(moduleName, `Starting async operation: ${fn.name}`);
      const result = await fn.apply(this, args);
      debugLog(moduleName, `Completed async operation: ${fn.name}`);
      return result;
    } catch (error) {
      console.error(`[${moduleName}] Error in ${fn.name}:`, error);
      throw error;
    }
  };
}