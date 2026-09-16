import { generateBruFile } from '../../src/bruno/generator.js';
import { parseBruFile } from '../../src/bruno/parser.js';
import { BruFile } from '../../src/bruno/types.js';

function roundTrip(bruFile: BruFile): BruFile {
  const text = generateBruFile(bruFile, { validateSyntax: false });
  return parseBruFile(text);
}

describe('parseBruFile round-trip', () => {
  test('basic GET request with no optional blocks', () => {
    const original: BruFile = {
      meta: { name: 'Get Users', type: 'http', seq: 1 },
      http: { method: 'GET', url: 'https://api.example.com/users', body: 'none', auth: 'none' },
    };
    expect(roundTrip(original)).toEqual(original);
  });

  test('headers, query, and vars', () => {
    const original: BruFile = {
      meta: { name: 'List Items', type: 'http' },
      http: { method: 'GET', url: '{{baseUrl}}/items', body: 'none', auth: 'none' },
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer {{token}}' },
      query: { page: 2, active: true, search: 'wid gets' },
      vars: { timeout: 3000, retry: false, label: "it's fine" },
    };
    expect(roundTrip(original)).toEqual(original);
  });

  test('nested JSON body with braces round-trips through the raw blob', () => {
    const original: BruFile = {
      meta: { name: 'Create Order', type: 'http' },
      http: { method: 'POST', url: '{{baseUrl}}/orders', body: 'json', auth: 'none' },
      body: {
        type: 'json',
        content: JSON.stringify(
          { customer: { id: 1, tags: ['a', 'b'] }, items: [{ sku: 'X1', qty: 2 }] },
          null,
          2
        ),
      },
    };
    expect(roundTrip(original)).toEqual(original);
  });

  test('multipart-form and form-urlencoded bodies', () => {
    const multipart: BruFile = {
      meta: { name: 'Upload', type: 'http' },
      http: { method: 'POST', url: '{{baseUrl}}/upload', body: 'form-data', auth: 'none' },
      body: {
        type: 'form-data',
        formData: [
          { name: 'title', value: 'my file', type: 'text' },
          { name: 'owner', value: 'brian', type: 'text' },
        ],
      },
    };
    expect(roundTrip(multipart)).toEqual(multipart);

    const urlencoded: BruFile = {
      meta: { name: 'Login Form', type: 'http' },
      http: { method: 'POST', url: '{{baseUrl}}/login', body: 'form-urlencoded', auth: 'none' },
      body: {
        type: 'form-urlencoded',
        formUrlEncoded: [
          { name: 'username', value: 'brian' },
          { name: 'password', value: 'hunter2' },
        ],
      },
    };
    expect(roundTrip(urlencoded)).toEqual(urlencoded);
  });

  test.each([
    ['bearer', { type: 'bearer', bearer: { token: 'abc123' } }] as const,
    ['basic', { type: 'basic', basic: { username: 'brian', password: 'pw' } }] as const,
    [
      'oauth2',
      {
        type: 'oauth2',
        oauth2: {
          grantType: 'authorization_code',
          accessTokenUrl: 'https://auth.example.com/token',
          authorizationUrl: 'https://auth.example.com/authorize',
          clientId: 'client-1',
          clientSecret: 'secret-1',
          scope: 'read write',
          username: 'brian',
          password: 'pw',
        },
      },
    ] as const,
    ['api-key', { type: 'api-key', apikey: { key: 'X-Api-Key', value: 'secret', in: 'header' } }] as const,
    ['digest', { type: 'digest', digest: { username: 'brian', password: 'pw' } }] as const,
  ])('%s auth round-trips', (_label, auth) => {
    const original: BruFile = {
      meta: { name: 'Authed Request', type: 'http' },
      http: { method: 'GET', url: '{{baseUrl}}/secure', body: 'none', auth: auth.type },
      auth,
    };
    expect(roundTrip(original)).toEqual(original);
  });

  test('scripts and tests containing braces and JS syntax', () => {
    const original: BruFile = {
      meta: { name: 'Scripted', type: 'http' },
      http: { method: 'POST', url: '{{baseUrl}}/things', body: 'none', auth: 'none' },
      script: {
        'pre-request': {
          exec: [
            'const payload = { timestamp: Date.now(), nested: { a: 1 } };',
            'bru.setVar("payload", JSON.stringify(payload));',
          ],
        },
        'post-response': {
          exec: ['if (res.status === 200) {', '  bru.setVar("id", res.body.id);', '}'],
        },
      },
      tests: {
        exec: [
          'test("has id", function() {',
          '  expect(res.body).to.have.property("id");',
          '});',
        ],
      },
    };
    expect(roundTrip(original)).toEqual(original);
  });

  test('docs block with markdown and a fenced code sample containing braces', () => {
    const original: BruFile = {
      meta: { name: 'Documented', type: 'http' },
      http: { method: 'GET', url: '{{baseUrl}}/docs-example', body: 'none', auth: 'none' },
      docs: [
        '# Docs Example',
        '',
        'Returns a widget.',
        '',
        '```json',
        '{ "id": 1, "nested": { "ok": true } }',
        '```',
      ].join('\n'),
    };
    expect(roundTrip(original)).toEqual(original);
  });

  test('throws BruFileError on missing meta/http blocks', () => {
    expect(() => parseBruFile('headers {\n  X: 1\n}\n')).toThrow('Missing required "meta" block');
    expect(() =>
      parseBruFile("meta {\n  name: 'x'\n  type: http\n}\n")
    ).toThrow('Missing required HTTP method block');
  });
});
