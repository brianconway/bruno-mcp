export type MockMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | '*';

export interface MockRoute {
  method: MockMethod;
  /** e.g. '/users/:id' or '/users/*' — matched by a small custom matcher, no path-to-regexp/Express. */
  path: string;
  status: number;
  headers?: Record<string, string>;
  body?: string;
  bodyType?: 'json' | 'text';
  delayMs?: number;
}

export interface MockServerConfig {
  name: string;
  collectionPath?: string;
  port?: number;
  routes: MockRoute[];
  createdAt: string;
  updatedAt: string;
}

export interface MockServerInstance {
  name: string;
  pid: number;
  port: number;
  configPath: string;
  collectionPath?: string;
  startedAt: string;
  logFile: string;
}

export interface MockServerState {
  servers: MockServerInstance[];
}
