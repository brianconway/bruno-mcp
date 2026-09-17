/**
 * TypeScript interfaces for Bruno BRU file format
 * Based on the Bru markup language specification
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
export type AuthType = 'none' | 'bearer' | 'basic' | 'oauth2' | 'api-key' | 'digest';
export type BodyType = 'none' | 'json' | 'text' | 'xml' | 'form-data' | 'form-urlencoded' | 'binary';
export interface BrunoCollection {
    version: string;
    name: string;
    type: 'collection';
    ignore?: string[];
    preRequestScript?: string;
    postResponseScript?: string;
    docs?: string;
}
export interface BrunoEnvironment {
    name: string;
    variables: Record<string, string | number | boolean>;
}
export interface BruMeta {
    name: string;
    type: 'http' | 'graphql';
    seq?: number;
}
export interface BruHttpRequest {
    method: HttpMethod;
    url: string;
    body: BodyType;
    auth: AuthType;
}
export interface BruAuth {
    type: AuthType;
    bearer?: {
        token: string;
    };
    basic?: {
        username: string;
        password: string;
    };
    oauth2?: {
        grantType: 'authorization_code' | 'client_credentials' | 'password';
        accessTokenUrl?: string;
        authorizationUrl?: string;
        clientId?: string;
        clientSecret?: string;
        scope?: string;
        username?: string;
        password?: string;
    };
    apikey?: {
        key: string;
        value: string;
        in: 'header' | 'query';
    };
    digest?: {
        username: string;
        password: string;
    };
}
export interface BruBody {
    type: BodyType;
    content?: string;
    formData?: Array<{
        name: string;
        value: string;
        type: 'text' | 'file';
        enabled?: boolean;
    }>;
    formUrlEncoded?: Array<{
        name: string;
        value: string;
        enabled?: boolean;
    }>;
}
export interface BruHeaders {
    [key: string]: string;
}
export interface BruQuery {
    [key: string]: string | number | boolean;
}
export interface BruVars {
    [key: string]: string | number | boolean;
}
export interface BruPreRequestScript {
    exec: string[];
}
export interface BruPostResponseScript {
    exec: string[];
}
export interface BruTests {
    exec: string[];
}
export interface BruFile {
    meta: BruMeta;
    http: BruHttpRequest;
    auth?: BruAuth;
    headers?: BruHeaders;
    query?: BruQuery;
    body?: BruBody;
    vars?: BruVars;
    script?: {
        'pre-request'?: BruPreRequestScript;
        'post-response'?: BruPostResponseScript;
    };
    tests?: BruTests;
    docs?: string;
}
export interface CreateRequestInput {
    collectionPath: string;
    name: string;
    method: HttpMethod;
    url: string;
    headers?: Record<string, string>;
    body?: {
        type: BodyType;
        content?: string;
        formData?: Array<{
            name: string;
            value: string;
            type?: 'text' | 'file';
        }>;
    };
    auth?: {
        type: AuthType;
        config: Record<string, string>;
    };
    query?: Record<string, string | number | boolean>;
    folder?: string;
    sequence?: number;
}
export interface CreateCollectionInput {
    name: string;
    description?: string;
    baseUrl?: string;
    outputPath: string;
    ignore?: string[];
}
export interface CreateEnvironmentInput {
    collectionPath: string;
    name: string;
    variables: Record<string, string | number | boolean>;
}
export interface AddTestScriptInput {
    bruFilePath: string;
    scriptType: 'pre-request' | 'post-response' | 'tests';
    script: string;
}
export interface CreateTestSuiteInput {
    collectionPath: string;
    suiteName: string;
    requests: Array<{
        name: string;
        method: HttpMethod;
        url: string;
        headers?: Record<string, string>;
        body?: {
            type: BodyType;
            content?: string;
        };
        auth?: {
            type: AuthType;
            config: Record<string, string>;
        };
        folder?: string;
    }>;
    dependencies?: Array<{
        from: string;
        to: string;
        variable: string;
    }>;
}
export interface BruGeneratorOptions {
    indentSize?: number;
    useSpaces?: boolean;
    addTimestamp?: boolean;
    validateSyntax?: boolean;
}
export declare class BrunoError extends Error {
    code: string;
    details?: Record<string, unknown> | undefined;
    constructor(message: string, code: string, details?: Record<string, unknown> | undefined);
}
export declare class BruValidationError extends BrunoError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class BruFileError extends BrunoError {
    constructor(message: string, details?: Record<string, unknown>);
}
export type BrunoCollectionConfig = Omit<BrunoCollection, 'type'> & {
    type?: 'collection';
};
export type HttpRequestMethod = Extract<HttpMethod, 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>;
export type AuthenticationMethod = Extract<AuthType, 'bearer' | 'basic' | 'oauth2' | 'api-key'>;
export interface FileOperationResult {
    success: boolean;
    path?: string;
    error?: string;
}
export interface DirectoryStructure {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: DirectoryStructure[];
}
//# sourceMappingURL=types.d.ts.map