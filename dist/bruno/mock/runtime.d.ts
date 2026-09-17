#!/usr/bin/env node
/**
 * Standalone mock server process, spawned (detached) by manager.ts. Not imported by
 * anything else — invoked directly as `node dist/bruno/mock/runtime.js --config
 * <path> --port <port>`. Deliberately plain `node:http`, no Express: routes are
 * static canned responses, not real routing logic.
 */
export {};
//# sourceMappingURL=runtime.d.ts.map