const DEBUG = process.env.DEBUG === 'true';

function ts() {
  return new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
}

function fmt(level, msg, meta) {
  const base = `[${ts()}] ${level.padEnd(5)} ${msg}`;
  return meta !== undefined ? `${base} ${JSON.stringify(meta)}` : base;
}

const logger = {
  info:  (msg, meta) => console.log(fmt('INFO',  msg, meta)),
  warn:  (msg, meta) => console.warn(fmt('WARN',  msg, meta)),
  error: (msg, meta) => console.error(fmt('ERROR', msg, meta)),
  debug: (msg, meta) => { if (DEBUG) console.log(fmt('DEBUG', msg, meta)); },
};

export default logger;
