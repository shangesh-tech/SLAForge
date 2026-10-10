const stamp = () => new Date().toISOString();
export const log = (...args) => console.log(stamp(), "[monitor]", ...args);
export const logError = (...args) => console.error(stamp(), "[monitor]", ...args);
