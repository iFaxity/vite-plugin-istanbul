import type { ServerResponse } from 'node:http';
import type { Connect } from 'vite';

import { COVERAGE_PUBLIC_PATH } from './constants';

// Returns the current code coverage in the global scope
// Used if an external endpoint is required to fetch code coverage
export function coverageMiddleware(
  req: Connect.IncomingMessage,
  res: ServerResponse,
  next: Connect.NextFunction
) {
  if (req.url !== COVERAGE_PUBLIC_PATH) {
    return next();
  }

  const coverage = global.__coverage__ ?? null;
  let data: string;

  try {
    data = JSON.stringify(coverage, null, 4);
  } catch (ex) {
    return next(ex);
  }

  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(data);
}
