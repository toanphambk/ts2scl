/**
 * Function Compiler
 * Compiles TypeScript classes decorated with @SCLFn into SCL functions
 * 
 * This compiler is responsible for:
 * 1. Reading TypeScript source files containing SCL function definitions
 * 2. Parsing and validating the TypeScript AST
 * 3. Extracting function metadata from decorators
 * 4. Coordinating with FunctionGenerator to produce SCL code
 * 5. Writing the generated SCL to output files
 * 
 * The compilation process follows these steps:
 * 1. Parse TypeScript source file
 * 2. Find classes decorated with @SCLFn
 * 3. Extract metadata and validate function structure
 * 4. Generate SCL code using FunctionGenerator
 * 5. Write output to .SCL file
 * 
 * Example input:
 * ```ts
 * @SCLFn({
 *   returnType: SCLTypeEnum.INT
 * })
 * class DriveCalculateSpeed {
 *   @Temp()
 *   private static tempStatusWord: WORD = toWORD(0);
 *   
 *   public static exec(`
 *     @Input() enable: BOOL,
 *     @Input() targetSpeed: INT
 *   ): INT {
 *     // Function implementation
 *   }
 * }
 * ```
 * 
 * Example output (TEST.SCL):
 * ```scl
 * FUNCTION "DriveCalculateSpeed" : INT
 * VAR_INPUT
 *     enable : BOOL;
 *     targetSpeed : INT;
 * END_VAR
 * VAR_TEMP
 *     tempStatusWord : WORD;
 * END_VAR
 * BEGIN
 *     // Function implementation
 * END_FUNCTION
 * ```
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { BaseCompiler } from '../base/base-compiler.js';
import { getSCLMetadata } from '../../utils/metadata-utils.js';
import { FunctionGenerator } from '../generators/fc-generator.js';
import { LogLevel } from '../../utils/logger.js';

/**
 * Main compiler class for converting TypeScript functions to SCL
 * Handles the complete compilation pipeline from TypeScript to SCL
 */
export class FunctionCompiler extends BaseCompiler {
    private readonly generator: FunctionGenerator;

    constructor() {
        super();
        this.generator = new FunctionGenerator();
        this.logger.setLogLevel(LogLevel.DEBUG);
    }

    /**
     * Main compilation method that processes the input TypeScript file and generates SCL output
     * @param inputPath Path to the TypeScript source file
     * @param outputPath Path where the SCL file should be written
     */
    protected async Compile(inputPath: string, outputPath: string): Promise<void> {
        try {
            this.logger.debug('Starting function compilation', { inputPath });
            const { program, sourceFile } = this.createTypeScriptProgram(inputPath);
            const fcTypes = await this.getFCTypes(inputPath);

            this.generator.setSourceFile(sourceFile, program);

            for (const type of fcTypes) {
                const metadata = getSCLMetadata(type);
                const blockName = this.validateBlockName(metadata, type);
                const classDeclaration = this.getClassDeclaration(sourceFile, blockName);

                // Generate function SCL
                const blockContent = this.generator.generateFunctionContent(classDeclaration);
                const blockOutputPath = resolve(outputPath, `${blockName}.fc.scl`);
                writeFileSync(blockOutputPath, blockContent, 'utf8');
                this.logger.info('Successfully wrote function file', { blockName, outputPath: blockOutputPath });

                // Generate instance DBs if any
                const instances = this.generator.getInstanceDBMetadata(classDeclaration);
                for (const instance of instances) {
                    const dbContent = this.generator.generateInstanceDB(instance.name, instance.instanceType);
                    const dbOutputPath = resolve(outputPath, `${instance.name}.instance.db`);
                    writeFileSync(dbOutputPath, dbContent, 'utf8');
                }
            }
        } catch (error) {
            this.handleCompilationError(error, inputPath, outputPath);
        }
    }

    /**
     * Handles errors that occur during compilation
     * Logs the error and throws it for upstream handling
     * @param error The error that occurred
     * @param inputPath The input file path being processed
     * @param outputPath The output file path being written to
     */
    private handleCompilationError(error: unknown, inputPath: string, outputPath: string): never {
        this.logger.error('Failed to compile functions', {
            error: error instanceof Error ? error : new Error(String(error)),
            inputPath,
            outputPath,
        });
        throw error;
    }

    /**
     * Retrieves all Function (FC) types from the input TypeScript file
     * Filters for classes decorated with @SCLFn that have category 'FC'
     * @param inputTypesDir Path to the TypeScript source directory
     * @returns Array of Function types
     */
    protected async getFCTypes(inputTypesDir: string): Promise<Function[]> {
        try {
            const inputTypes = await import(inputTypesDir);
            return Object.values(inputTypes).filter(this.isFCType);
        } catch (error) {
            this.logger.error('Failed to get FC types', {
                error: error instanceof Error ? error : new Error(String(error)),
                inputTypesDir,
            });
            throw error;
        }
    }

    /**
     * Type guard that checks if a value is a Function type
     * Validates that it has the correct SCL metadata with category 'FC'
     * @param value The value to check
     * @returns true if the value is a Function type
     */
    private isFCType(value: unknown): value is Function {
        if (typeof value !== 'function') return false;
        const metadata = getSCLMetadata(value);
        return metadata.blockOptions?.category === 'FC';
    }
}