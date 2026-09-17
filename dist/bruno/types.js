/**
 * TypeScript interfaces for Bruno BRU file format
 * Based on the Bru markup language specification
 */
// Error types
export class BrunoError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'BrunoError';
    }
}
export class BruValidationError extends BrunoError {
    constructor(message, details) {
        super(message, 'VALIDATION_ERROR', details);
        this.name = 'BruValidationError';
    }
}
export class BruFileError extends BrunoError {
    constructor(message, details) {
        super(message, 'FILE_ERROR', details);
        this.name = 'BruFileError';
    }
}
//# sourceMappingURL=types.js.map