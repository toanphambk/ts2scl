/**
 * Main Compiler
 * Orchestrates compilation of all SCL block types (UDT, DB, FC, FB)
 * from a single TypeScript source file
 */

import { resolve, relative, dirname } from 'path';
import { TypeCompiler } from './compilers/type-compiler.js';
import { DataBlockCompiler } from './compilers/db-compiler.js';
import { FunctionCompiler } from './compilers/fc-compiler.js';
import { FunctionBlockCompiler } from './compilers/fb-compiler.js';
import { BaseCompiler } from './base/base-compiler.js';
import { LogLevel } from '../utils/logger.js';
import { mkdirSync } from 'fs';

export class MainCompiler extends BaseCompiler {
    private readonly typeCompiler: TypeCompiler;
    private readonly dbCompiler: DataBlockCompiler;
    private readonly fcCompiler: FunctionCompiler;
    private readonly fbCompiler: FunctionBlockCompiler;

    constructor() {
        super();
        this.typeCompiler = new TypeCompiler();
        this.dbCompiler = new DataBlockCompiler();
        this.fcCompiler = new FunctionCompiler();
        this.fbCompiler = new FunctionBlockCompiler();
        this.logger.setLogLevel(LogLevel.DEBUG);
    }

    /**
     * Main compilation method that processes all block types from a single input file
     * @param inputPath Path to the TypeScript source file
     * @param outputDir Directory where the SCL files should be written
     */
    public async compile(inputPath: string, outputDir: string): Promise<boolean> {
        try {
            this.logger.debug('Starting main compilation', { inputPath, outputDir });

            // Get the relative path of the input file from the workspace root
            const workspaceRoot = resolve(process.cwd());
            const relativeInputPath = relative(workspaceRoot, resolve(inputPath));
            const relativeDir = dirname(relativeInputPath);

            const outDir = resolve(outputDir, relativeDir);
            mkdirSync(outDir, { recursive: true });

            // Run all compilers in parallel for better performance
            await Promise.all([
                this.typeCompiler.compile(inputPath, outDir),
                this.dbCompiler.compile(inputPath, outDir),
                this.fcCompiler.compile(inputPath, outDir),
                this.fbCompiler.compile(inputPath, outDir)
            ]);

            this.logger.info('Successfully completed compilation', { inputPath, outputDir });
            return true;
        } catch (error) {
            this.handleCompilationError(error, inputPath, outputDir);
        }
    }

    protected async Compile(inputPath: string, outputPath: string): Promise<void> {
        await this.compile(inputPath, outputPath);
    }

    private handleCompilationError(error: unknown, inputPath: string, outputDir: string): never {
        this.logger.error('Failed to compile SCL blocks', {
            error: error instanceof Error ? error : new Error(String(error)),
            inputPath,
            outputDir,
        });

        throw error;
    }
} 