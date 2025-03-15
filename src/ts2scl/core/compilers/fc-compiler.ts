/**
 * Function Compiler
 * Compiles TypeScript classes decorated with @SCLFn into SCL functions
 * 
 * This compiler is responsible for:
 * 1. Reading TypeScript source files containing SCL function definitions
 * 2. Parsing and validating the TypeScript AST
 * 3. Extracting function metadata from decorators
 * 4. Coordinating with FunctionGenerator to produce SCL code
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
 */

import ts from 'typescript';
import { BaseCompiler } from '../base/base-compiler.js';
import { getSCLMetadata } from '../../utils/metadata-utils.js';
import { FunctionGenerator } from '../generators/fc-generator.js';
import { LogLevel } from '../../utils/logger.js';
import { SCLBlockMetadata } from '../types/metadata-types.js';
import { InstanceDBGenerator } from '../generators/instance-generator.js';
import { SCLInstanceType } from '../types/types.js';
/**
 * Main compiler class for converting TypeScript functions to SCL
 * Handles the complete compilation pipeline from TypeScript to SCL
 */
export class FunctionCompiler extends BaseCompiler {
    private static instance: FunctionCompiler;
    private readonly generator: FunctionGenerator;
    private readonly instanceDBGenerator: InstanceDBGenerator;

    private constructor() {
        super();
        this.generator = new FunctionGenerator();
        this.instanceDBGenerator = InstanceDBGenerator.getInstance();
        this.logger.setLogLevel(LogLevel.DEBUG);
    }

    /**
     * Gets the singleton instance of FunctionCompiler
     * @returns The singleton instance
     */
    public static getInstance(): FunctionCompiler {
        if (!FunctionCompiler.instance) {
            FunctionCompiler.instance = new FunctionCompiler();
        }
        return FunctionCompiler.instance;
    }

    /**
     * Generates SCL code for a function
     * @param inputPath Path to the TypeScript source file
     * @param metadata Metadata for the function
     * @param program TypeScript program
     * @param sourceFile TypeScript source file
     * @returns Generated SCL code as string
     */
    public async generateCode(
        inputPath: string,
        metadata: SCLBlockMetadata,
        program: ts.Program,
        sourceFile: ts.SourceFile
    ): Promise<string> {
        try {
            this.logger.debug('Generating function code', { blockName: metadata.blockOptions.name });
            const blockName = metadata.blockOptions.name;

            // Set the source file and program for the generator
            this.generator.setSourceFile(sourceFile, program);

            // Get the class declaration
            const classDeclaration = this.getClassDeclaration(sourceFile, blockName);

            // Generate the function content
            return this.generator.generateFunctionContent(classDeclaration);
        } catch (error) {
            this.logger.error('Failed to generate function code', {
                error: error instanceof Error ? error : new Error(String(error)),
                blockName: metadata.blockOptions.name
            });
            throw error;
        }
    }

    /**
     * Gets instance DB metadata for a function
     * This is used by MainCompiler to generate instance DBs
     * @param metadata Metadata for the function
     * @param program TypeScript program
     * @param sourceFile TypeScript source file
     * @returns Array of instance DB metadata
     */
    public getInstanceDBs(
        metadata: SCLBlockMetadata,
        sourceFile: ts.SourceFile
    ): { name: string, instanceType: SCLInstanceType, instanceSclType: string, sclInstruction?: string }[] {
        try {
            const blockName = metadata.blockOptions.name;
            const classDeclaration = this.getClassDeclaration(sourceFile, blockName);
            return this.instanceDBGenerator.getInstanceDBMetadata(classDeclaration, 'FC');
        } catch (error) {
            this.logger.error('Failed to get instance DBs', {
                error: error instanceof Error ? error : new Error(String(error)),
                blockName: metadata.blockOptions.name
            });
            return [];
        }
    }


    /**
     * Collects metadata from a file without generating output
     * @param inputPath Path to the TypeScript source file
     */
    protected async CollectMetadata(inputPath: string): Promise<void> {
        // This is now handled by MainCompiler
        this.logger.debug('CollectMetadata is now handled by MainCompiler');
    }
}