import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { tap } from 'rxjs/operators';

export interface RequestLogEntry {
  requestTimestamp: string;
  request: {
    method: string;
    url: string;
    params: Record<string, string>;
    body: unknown;
  };
  responseTimestamp: string;
  response: unknown;
}

const CSV_HEADERS = ['requestTimestamp', 'method', 'url', 'params', 'body', 'responseTimestamp', 'response'];

// Bounded so a long-running session (e.g. the auto-clicker QA tool) can't grow this
// array, and every logged response body it retains, without limit for the life of the tab.
// The entry count alone is not a memory bound: 500 list responses measured ~2 MB of
// retained payloads in a soak test, so the newest entries are kept within a byte
// budget as well.
const MAX_LOG_ENTRIES = 500;
const MAX_LOG_BYTES = 512 * 1024;

const logs: RequestLogEntry[] = [];
// Sizes live beside the entries rather than in a parallel array, so callers
// that mutate the exported array (tests, manual clearing) can't desync them.
const entrySizes = new WeakMap<RequestLogEntry, number>();

/** Rough retained size of a logged payload; only used to bound the buffer. */
function approximateSize(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === 'string') {
    return value.length * 2;
  }
  try {
    return (JSON.stringify(value)?.length ?? 0) * 2;
  } catch {
    // Circular or otherwise unserialisable: assume it is worth trimming for.
    return MAX_LOG_BYTES;
  }
}

function retainedBytes(): number {
  let total = 0;
  for (const entry of logs) {
    total += entrySizes.get(entry) ?? 0;
  }
  return total;
}

function trimLogs(): void {
  while (logs.length > MAX_LOG_ENTRIES) {
    logs.shift();
  }
  while (logs.length > 1 && retainedBytes() > MAX_LOG_BYTES) {
    logs.shift();
  }
}

function escapeCsvCell(value: unknown): string {
  let str: string;
  if (value === null || value === undefined) {
    str = '';
  } else if (typeof value === 'string') {
    str = value;
  } else if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    str = String(value);
  } else {
    str = JSON.stringify(value);
  }
  // Wrap in quotes and escape any existing double-quotes
  return `"${str.replaceAll('"', '""')}"`;
}

export function getRequestLogs(): RequestLogEntry[] {
  return logs;
}

export function downloadLogsAsCsv(filename = 'request-log.csv'): void {
  if (logs.length === 0) {
    console.warn('[request-log] No logs to export.');
    return;
  }

  const rows = logs.map((entry) => [
    escapeCsvCell(entry.requestTimestamp),
    escapeCsvCell(entry.request.method),
    escapeCsvCell(entry.request.url),
    escapeCsvCell(entry.request.params),
    escapeCsvCell(entry.request.body),
    escapeCsvCell(entry.responseTimestamp),
    escapeCsvCell(entry.response),
  ]);

  const csvContent = [CSV_HEADERS.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);

  logs.length = 0;
}

export const requestLogInterceptor: HttpInterceptorFn = (req, next) => {
  const requestTimestamp = new Date().toISOString();

  const params: Record<string, string> = {};
  req.params.keys().forEach((key) => {
    params[key] = req.params.get(key) ?? '';
  });

  const requestSnapshot = {
    method: req.method,
    url: req.url,
    params,
    body: req.body,
  };

//   console.group(`[Request] ${req.method} ${req.url}`);
//   console.log('Timestamp:', requestTimestamp);
//   console.log('Payload:', requestSnapshot.body ?? '(none)');
//   console.log('Params:', requestSnapshot.params);
//   console.groupEnd();

  return next(req).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) {
          const responseTimestamp = new Date().toISOString();
          const entry: RequestLogEntry = {
            requestTimestamp,
            request: requestSnapshot,
            responseTimestamp,
            response: event.body,
          };
          logs.push(entry);
          entrySizes.set(
            entry,
            approximateSize(event.body) + approximateSize(requestSnapshot.body)
          );
          trimLogs();
        }
      },
    })
  );
};
