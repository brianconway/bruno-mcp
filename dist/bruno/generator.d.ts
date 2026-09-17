/**
 * BRU file generator with proper syntax
 * Generates Bruno API testing files in the correct BRU format
 */
import { BruFile, BruGeneratorOptions } from './types.js';
export declare class BruGenerator {
    private options;
    constructor(options?: BruGeneratorOptions);
    /**
     * Generate a complete .bru file from a BruFile object
     */
    generateBruFile(bruFile: BruFile): string;
    /**
     * Generate meta block
     */
    private generateMetaBlock;
    /**
     * Generate HTTP request block
     */
    private generateHttpBlock;
    /**
     * Generate auth block
     */
    private generateAuthBlock;
    /**
     * Generate headers block
     */
    private generateHeadersBlock;
    /**
     * Generate query parameters block
     */
    private generateQueryBlock;
    /**
     * Generate body block
     */
    private generateBodyBlock;
    /**
     * Generate variables block
     */
    private generateVarsBlock;
    /**
     * Generate pre-request script block
     */
    private generatePreRequestScript;
    /**
     * Generate post-response script block
     */
    private generatePostResponseScript;
    /**
     * Generate tests block
     */
    private generateTestsBlock;
    /**
     * Validate BRU file structure
     */
    private validateBruFile;
    /**
     * Validate authentication configuration
     */
    private validateAuthConfig;
    /**
     * Basic URL validation
     */
    private isValidUrl;
    /**
     * Escape string values for BRU format
     */
    private escapeString;
    /**
     * Format various value types
     */
    private formatValue;
    /**
     * Add indentation to a line
     */
    private indent;
}
/**
 * Convenience function to generate a BRU file
 */
export declare function generateBruFile(bruFile: BruFile, options?: BruGeneratorOptions): string;
/**
 * Create a basic BRU file structure
 */
export declare function createBasicBruFile(name: string, method: string, url: string, sequence?: number): BruFile;
//# sourceMappingURL=generator.d.ts.map