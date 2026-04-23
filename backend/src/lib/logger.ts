type Meta = Record<string, unknown>;

function emit(level: 'info' | 'warn' | 'error', msg: string, meta?: Meta) {
  const line = JSON.stringify({
    level,
    msg,
    ...meta,
    ts: new Date().toISOString(),
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const log = {
  info: (msg: string, meta?: Meta) => emit('info', msg, meta),
  warn: (msg: string, meta?: Meta) => emit('warn', msg, meta),
  error: (msg: string, meta?: Meta) => emit('error', msg, meta),
};
