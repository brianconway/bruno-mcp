/**
 * A small, dependency-free path/method matcher for mock routes. Supports `:param`
 * segments and a trailing `*` wildcard — intentionally not a general-purpose router
 * (no regex patterns, no Express), since mock routes are simple canned responses.
 */

import { MockRoute } from './types.js';

export function pathMatches(pattern: string, actualPath: string): boolean {
  const patternParts = pattern.split('/').filter((p) => p.length > 0);
  const actualParts = actualPath.split('/').filter((p) => p.length > 0);

  for (let i = 0; i < patternParts.length; i++) {
    const part = patternParts[i];
    if (part === '*') {
      return true;
    }
    if (i >= actualParts.length) {
      return false;
    }
    if (part.startsWith(':')) {
      continue;
    }
    if (part !== actualParts[i]) {
      return false;
    }
  }

  return patternParts.length === actualParts.length;
}

export function matchRoute(routes: MockRoute[], method: string, actualPath: string): MockRoute | undefined {
  const upperMethod = method.toUpperCase();
  return routes.find(
    (route) => (route.method === '*' || route.method.toUpperCase() === upperMethod) && pathMatches(route.path, actualPath)
  );
}
