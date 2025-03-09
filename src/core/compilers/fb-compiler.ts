/**
 * Function Block Compiler
 * Compiles TypeScript classes decorated with @SCLFB into SCL function blocks
 * 
 * This compiler is responsible for:
 * 1. Reading TypeScript source files containing SCL function block definitions
 * 2. Parsing and validating the TypeScript AST
 * 3. Extracting function block metadata from decorators
 * 4. Coordinating with FunctionBlockGenerator to produce SCL code
 * 5. Writing the generated SCL to output files
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

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { BaseCompiler } from '../base/base-compiler.js';
import { getSCLMetadata } from '../../utils/metadata-utils.js';
import { FunctionBlockGenerator } from '../generators/fb-generator.js';
import { LogLevel } from '../../utils/logger.js';

export class FunctionBlockCompiler extends BaseCompiler {
    private readonly generator: FunctionBlockGenerator;

    constructor() {
        super();
        this.generator = new FunctionBlockGenerator();
        this.logger.setLogLevel(LogLevel.DEBUG);
    }

    protected async Compile(inputPath: string, outputPath: string): Promise<void> {
        try {
            this.logger.debug('Starting function block compilation', { inputPath });
            const { program, sourceFile } = this.createTypeScriptProgram(inputPath);
            const fbTypes = await this.getFBTypes(inputPath);

            this.generator.setSourceFile(sourceFile, program);

            for (const type of fbTypes) {
                const metadata = getSCLMetadata(type);
                const blockName = this.validateBlockName(metadata, type);
                const classDeclaration = this.getClassDeclaration(sourceFile, blockName);
                const blockContent = this.generator.generateFunctionBlockContent(classDeclaration);
                const blockOutputPath = resolve(outputPath, `${blockName}.fb.scl`);

                writeFileSync(blockOutputPath, blockContent, 'utf8');
                this.logger.info('Successfully wrote function block file', { blockName, outputPath: blockOutputPath });
            }
        } catch (error) {
            this.handleCompilationError(error, inputPath, outputPath);
        }
    }

    private handleCompilationError(error: unknown, inputPath: string, outputPath: string): never {
        this.logger.error('Failed to compile function blocks', {
            error: error instanceof Error ? error : new Error(String(error)),
            inputPath,
            outputPath,
        });
        throw error;
    }


    protected async getFBTypes(inputTypesDir: string): Promise<Function[]> {
        try {
            const inputTypes = await import(inputTypesDir);
            return Object.values(inputTypes).filter(this.isFBType);
        } catch (error) {
            this.logger.error('Failed to get FB types', {
                error: error instanceof Error ? error : new Error(String(error)),
                inputTypesDir,
            });
            throw error;
        }
    }

    private isFBType(value: unknown): value is Function {
        if (typeof value !== 'function') return false;
        const metadata = getSCLMetadata(value);
        return metadata.blockOptions?.category === 'FB';
    }
} 