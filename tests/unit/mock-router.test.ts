import { pathMatches, matchRoute } from '../../src/bruno/mock/router.js';
import { MockRoute } from '../../src/bruno/mock/types.js';

describe('pathMatches', () => {
  test('matches exact paths', () => {
    expect(pathMatches('/users', '/users')).toBe(true);
    expect(pathMatches('/users', '/orders')).toBe(false);
  });

  test('matches :param segments against any single segment', () => {
    expect(pathMatches('/users/:id', '/users/42')).toBe(true);
    expect(pathMatches('/users/:id', '/users/abc')).toBe(true);
    expect(pathMatches('/users/:id', '/users')).toBe(false);
    expect(pathMatches('/users/:id', '/users/42/orders')).toBe(false);
  });

  test('matches multiple :param segments', () => {
    expect(pathMatches('/users/:id/orders/:orderId', '/users/1/orders/99')).toBe(true);
    expect(pathMatches('/users/:id/orders/:orderId', '/users/1/orders')).toBe(false);
  });

  test('a trailing * matches the rest of the path, including nothing further', () => {
    expect(pathMatches('/users/*', '/users/42')).toBe(true);
    expect(pathMatches('/users/*', '/users/42/orders/99')).toBe(true);
    expect(pathMatches('/users/*', '/users')).toBe(true);
    expect(pathMatches('/*', '/anything/at/all')).toBe(true);
  });

  test('handles leading/trailing slashes consistently', () => {
    expect(pathMatches('/users/:id', 'users/42/')).toBe(true);
    expect(pathMatches('/', '/')).toBe(true);
  });
});

describe('matchRoute', () => {
  const routes: MockRoute[] = [
    { method: 'GET', path: '/users/:id', status: 200 },
    { method: 'POST', path: '/users', status: 201 },
    { method: '*', path: '/health', status: 200 },
  ];

  test('matches on method and path together', () => {
    expect(matchRoute(routes, 'GET', '/users/1')?.status).toBe(200);
    expect(matchRoute(routes, 'POST', '/users')?.status).toBe(201);
    expect(matchRoute(routes, 'GET', '/users')).toBeUndefined();
  });

  test('is case-insensitive on method', () => {
    expect(matchRoute(routes, 'get', '/users/1')?.status).toBe(200);
  });

  test('a wildcard method route matches any HTTP method', () => {
    expect(matchRoute(routes, 'GET', '/health')?.status).toBe(200);
    expect(matchRoute(routes, 'DELETE', '/health')?.status).toBe(200);
  });

  test('returns undefined when nothing matches', () => {
    expect(matchRoute(routes, 'GET', '/nope')).toBeUndefined();
  });

  test('returns the first matching route when routes overlap', () => {
    const overlapping: MockRoute[] = [
      { method: 'GET', path: '/users/:id', status: 200, body: 'specific' },
      { method: 'GET', path: '/users/*', status: 200, body: 'wildcard' },
    ];
    expect(matchRoute(overlapping, 'GET', '/users/1')?.body).toBe('specific');
  });
});
