// Export core functionality
export * from './core/types/types.js';
export {
    SCLType,
    SCLDb,
    SCLFn,
    SCLFB,
    SCLArray,
    Instance,
    Retain,
    Visibility,
    Temp,
    Static,
    Input,
    Output
} from './core/types/decorators.js';
export * from './core/types/metadata-types.js';

// Export main compiler
export * from './core/main-compiler.js';

// Export utility functions
export * from './utils/metadata-utils.js';

/**
 * Convert a TypeScript type to SCL code
 * @param typeName The name of the type to convert
 * @returns The generated SCL code
 */
export function convertTypeToSCL<T>(typeName: string): string {
    // This is a placeholder implementation
    // The actual implementation would use the compiler to generate SCL code
    return `// Generated SCL code for ${typeName}\n// This is a placeholder implementation`;
} 