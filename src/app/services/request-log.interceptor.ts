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

const logs: RequestLogEntry[] = [];

function escapeCsvCell(value: unknown): string {
  let str: string;
  if (value === null || value === undefined) {
    str = '';
  } else if (typeof value === 'object') {
    str = JSON.stringify(value);
  } else {
    str = String(value);
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
          logs.push({
            requestTimestamp,
            request: requestSnapshot,
            responseTimestamp,
            response: event.body,
          });
        }
      },
    })
  );
};
