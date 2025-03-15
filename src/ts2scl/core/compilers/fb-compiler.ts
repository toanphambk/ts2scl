/**
 * Function Block Compiler
 * Compiles TypeScript classes decorated with @SCLFB into SCL function blocks
 * 
 * This compiler is responsible for:
 * 1. Reading TypeScript source files containing SCL function block definitions
 * 2. Parsing and validating the TypeScript AST
 * 3. Extracting function block metadata from decorators
 * 4. Coordinating with FunctionBlockGenerator to produce SCL code
 * 
 * Example input:
 * ```ts
 * @SCLFB()
 * class DriveController {
 *   @Static()
 *   private static statusWord: WORD = toWORD(0);
 *   
 *   public static exec(
 *     @Input() enable: BOOL,
 *     @Input() targetSpeed: INT,
 *     @Output() status: INT
 *   ): void {
 *     // Function block implementation
 *   }
 * }
 * ```
 */

import ts from 'typescript';
import { BaseCompiler } from '../base/base-compiler.js';
import { getSCLMetadata } from '../../utils/metadata-utils.js';
import { FunctionBlockGenerator } from '../generators/fb-generator.js';
import { LogLevel } from '../../utils/logger.js';
import { SCLBlockMetadata } from '../types/metadata-types.js';
import { InstanceDBGenerator } from '../generators/instance-generator.js';
import { SCLInstanceType } from '../types/types.js';
export class FunctionBlockCompiler extends BaseCompiler {
    private static instance: FunctionBlockCompiler;
    private readonly generator: FunctionBlockGenerator;
    private readonly instanceDBGenerator: InstanceDBGenerator;

    private constructor() {
        super();
        this.generator = new FunctionBlockGenerator();
        this.instanceDBGenerator = InstanceDBGenerator.getInstance();
        this.logger.setLogLevel(LogLevel.DEBUG);
    }

    /**
     * Gets the singleton instance of FunctionBlockCompiler
     * @returns The singleton instance
     */
    public static getInstance(): FunctionBlockCompiler {
        if (!FunctionBlockCompiler.instance) {
            FunctionBlockCompiler.instance = new FunctionBlockCompiler();
        }
        return FunctionBlockCompiler.instance;
    }

    /**
     * Generates SCL code for a function block
     * @param inputPath Path to the TypeScript source file
     * @param metadata Metadata for the function block
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
            this.logger.debug('Generating function block code', { blockName: metadata.blockOptions.name });
            const blockName = metadata.blockOptions.name;

            // Set the source file and program for the generator
            this.generator.setSourceFile(sourceFile, program);

            // Get the class declaration
            const classDeclaration = this.getClassDeclaration(sourceFile, blockName);

            // Generate the function block content
            return this.generator.generateFunctionBlockContent(classDeclaration);
        } catch (error) {
            this.logger.error('Failed to generate function block code', {
                error: error instanceof Error ? error : new Error(String(error)),
                blockName: metadata.blockOptions.name
            });
            throw error;
        }
    }

    public getInstanceDBs(
        metadata: SCLBlockMetadata,
        sourceFile: ts.SourceFile
    ): { name: string, instanceType: SCLInstanceType, instanceSclType: string, sclInstruction?: string }[] {
        try {
            const blockName = metadata.blockOptions.name;
            const classDeclaration = this.getClassDeclaration(sourceFile, blockName);
            return this.instanceDBGenerator.getInstanceDBMetadata(classDeclaration, 'FB');
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