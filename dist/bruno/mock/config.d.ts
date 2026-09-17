import { MockRoute, MockServerConfig } from './types.js';
export declare function mockConfigPath(collectionPath: string, name: string): string;
export declare function saveMockConfig(collectionPath: string, name: string, routes: MockRoute[], port?: number): Promise<MockServerConfig>;
export declare function loadMockConfig(filePath: string): Promise<MockServerConfig>;
//# sourceMappingURL=config.d.ts.map