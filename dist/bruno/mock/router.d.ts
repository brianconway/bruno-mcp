/**
 * A small, dependency-free path/method matcher for mock routes. Supports `:param`
 * segments and a trailing `*` wildcard — intentionally not a general-purpose router
 * (no regex patterns, no Express), since mock routes are simple canned responses.
 */
import { MockRoute } from './types.js';
export declare function pathMatches(pattern: string, actualPath: string): boolean;
export declare function matchRoute(routes: MockRoute[], method: string, actualPath: string): MockRoute | undefined;
//# sourceMappingURL=router.d.ts.map