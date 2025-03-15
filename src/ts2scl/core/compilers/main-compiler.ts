/**
 * Main Compiler
 * Orchestrates compilation of all SCL block types (UDT, DB, FC, FB)
 * from a single TypeScript source file
 */

import 'reflect-metadata';
import { resolve, relative, dirname } from 'path';
import { writeFileSync } from 'fs';
import { BaseCompiler } from '../base/base-compiler.js';
import { LogLevel } from '../../utils/logger.js';
import { mkdirSync } from 'fs';
import { DataBlockCompiler } from './db-compiler.js';
import { FunctionBlockCompiler } from './fb-compiler.js';
import { FunctionCompiler } from './fc-compiler.js';
import { TypeCompiler } from './type-compiler.js';
import { SCLBlockMetadata } from '../types/metadata-types.js';
import { getSCLMetadata } from '../../utils/metadata-utils.js';
import { SCLCategory, SCLInstanceType } from '../types/types.js';
import * as ts from 'typescript';
import { InstanceDBGenerator, MetadataLookup } from '../generators/instance-generator.js';


export class MainCompiler extends BaseCompiler implements MetadataLookup {
    private static instance: MainCompiler;
    private readonly typeCompiler: TypeCompiler;
    private readonly dbCompiler: DataBlockCompiler;
    private readonly fcCompiler: FunctionCompiler;
    private readonly fbCompiler: FunctionBlockCompiler;
    private readonly instanceDBGenerator: InstanceDBGenerator;
    private readonly metadataRegistry: Map<string, SCLBlockMetadata> = new Map();
    private processedFiles: Set<string> = new Set();

    private constructor() {
        super();
        this.typeCompiler = TypeCompiler.getInstance();
        this.dbCompiler = DataBlockCompiler.getInstance();
        this.fcCompiler = FunctionCompiler.getInstance();
        this.fbCompiler = FunctionBlockCompiler.getInstance();
        this.instanceDBGenerator = InstanceDBGenerator.getInstance();
        this.logger.setLogLevel(LogLevel.DEBUG);
    }

    /**
     * Creates a composite key for the metadata registry
     * @param blockName The name of the block
     * @param blockType The type of the block (UDT, DB, FC, FB)
     * @returns A composite key string
     */
    private createMetadataKey(blockName: string, blockType: SCLCategory): string {
        return `${blockName}:${blockType}`;
    }

    /**
     * Parses a composite key into its components
     * @param key The composite key
     * @returns An object with blockName and blockType
     */
    private parseMetadataKey(key: string): { blockName: string, blockType: SCLCategory } {
        const [blockName, blockType] = key.split(':');
        return {
            blockName,
            blockType: blockType as SCLCategory
        };
    }

    /**
     * Gets the singleton instance of MainCompiler
     * @returns The singleton instance
     */
    public static getInstance(): MainCompiler {
        if (!MainCompiler.instance) {
            MainCompiler.instance = new MainCompiler();
        }
        return MainCompiler.instance;
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

            // Process the main file and all its imports recursively to collect metadata
            await this.processFileAndImports(inputPath);

            // Create TypeScript program for code generation
            const { program, sourceFile } = this.createTypeScriptProgram(inputPath);

            // Process all block types in parallel
            const compilePromises: Promise<void>[] = [];

            // Process UDT types
            compilePromises.push(this.compileBlockType(inputPath, 'UDT', outDir, program, sourceFile));

            // Process DB types
            compilePromises.push(this.compileBlockType(inputPath, 'DB', outDir, program, sourceFile));

            // Process FC types
            compilePromises.push(this.compileBlockType(inputPath, 'FC', outDir, program, sourceFile));

            // Process FB types
            compilePromises.push(this.compileBlockType(inputPath, 'FB', outDir, program, sourceFile));

            // Wait for all compilation tasks to complete
            await Promise.all(compilePromises);

            this.logger.info('Successfully completed compilation', { inputPath, outputDir });
            return true;
        } catch (error) {
            this.handleCompilationError(error, inputPath, outputDir);
        }
    }

    /**
     * Generates instance DB files for a block
     * @param instances Array of instance DB metadata
     * @param outDir Output directory
     */
    private generateInstanceDBFiles(
        instances: { name: string, instanceType: SCLInstanceType, instanceSclType: string, sclInstruction?: string }[],
        outDir: string
    ): void {
        if (instances.length === 0) {
            return;
        }

        this.logger.debug(`Generating ${instances.length} instance DB files`);

        for (const instance of instances) {
            try {
                if (instance.instanceType === 'single') {
                    const { name, instanceType, instanceSclType, sclInstruction } = instance;
                    const dbContent = this.instanceDBGenerator.generateInstanceDB(name, instanceType, instanceSclType, sclInstruction);
                    const dbOutputPath = resolve(outDir, `${instance.name}.instance.db`);
                    writeFileSync(dbOutputPath, dbContent, 'utf8');
                    this.logger.info('Successfully wrote instance DB file', {
                        instanceName: instance.name,
                        instanceType: instance.instanceType,
                        outputPath: dbOutputPath
                    });
                } else {
                    this.logger.warn('Instance type will not be generated', {
                        instanceName: instance.name,
                        instanceType: instance.instanceType,
                        instanceSclType: instance.instanceSclType
                    });
                    continue;
                }
            } catch (error) {
                this.logger.error('Failed to generate instance DB file', {
                    error: error instanceof Error ? error : new Error(String(error)),
                    instanceName: instance.name,
                    instanceType: instance.instanceType
                });
            }
        }
    }

    /**
     * Compiles blocks of a specific type from a file
     * @param inputPath Path to the TypeScript source file
     * @param blockType The type of block to compile (UDT, DB, FC, FB)
     * @param outDir Output directory
     * @param program TypeScript program
     * @param sourceFile TypeScript source file
     */
    private async compileBlockType(
        inputPath: string,
        blockType: SCLCategory,
        outDir: string,
        program: ts.Program,
        sourceFile: ts.SourceFile
    ): Promise<void> {
        try {
            const types = await this.getTypesFromFile(inputPath, blockType);

            // Process each type in parallel
            const typePromises = types.map(async (type) => {
                const metadata = getSCLMetadata(type);
                if (!metadata || !metadata.blockOptions || !metadata.blockOptions.name) {
                    this.logger.warn(`Invalid metadata for type: ${type.name}`);
                    return;
                }

                const blockName = metadata.blockOptions.name;
                // Verify that we have this metadata in our registry
                const metadataKey = this.createMetadataKey(blockName, blockType);
                if (!this.metadataRegistry.has(metadataKey)) {
                    this.logger.warn(`Metadata for ${blockType} block ${blockName} not found in registry, collecting now`);
                    this.metadataRegistry.set(metadataKey, metadata);
                }

                let code: string;
                let outputPath: string;
                let instances = [];

                switch (blockType) {
                    case 'UDT':
                        code = await this.typeCompiler.generateCode(inputPath, metadata, program, sourceFile);
                        outputPath = resolve(outDir, `${blockName}.udt`);
                        writeFileSync(outputPath, code, 'utf8');
                        this.logger.info('Successfully wrote type file', { blockName, outputPath });
                        break;

                    case 'DB':
                        code = await this.dbCompiler.generateCode(inputPath, metadata, program, sourceFile);
                        outputPath = resolve(outDir, `${blockName}.db`);
                        writeFileSync(outputPath, code, 'utf8');
                        this.logger.info('Successfully wrote data block file', { blockName, outputPath });
                        break;

                    case 'FC':
                        code = await this.fcCompiler.generateCode(inputPath, metadata, program, sourceFile);
                        outputPath = resolve(outDir, `${blockName}.fc.scl`);
                        writeFileSync(outputPath, code, 'utf8');
                        this.logger.info('Successfully wrote function file', { blockName, outputPath });

                        // Generate instance DBs if any
                        instances = this.fcCompiler.getInstanceDBs(metadata, sourceFile);
                        this.generateInstanceDBFiles(instances, outDir);
                        break;

                    case 'FB':
                        code = await this.fbCompiler.generateCode(inputPath, metadata, program, sourceFile);
                        outputPath = resolve(outDir, `${blockName}.fb.scl`);
                        writeFileSync(outputPath, code, 'utf8');
                        this.logger.info('Successfully wrote function block file', { blockName, outputPath });

                        // Generate instance DBs if any
                        instances = this.fbCompiler.getInstanceDBs(metadata, sourceFile);
                        this.generateInstanceDBFiles(instances, outDir);
                        break;
                }
            });

            await Promise.all(typePromises);
        } catch (error) {
            this.logger.error(`Failed to compile ${blockType} blocks`, {
                error: error instanceof Error ? error : new Error(String(error)),
                inputPath
            });
        }
    }

    /**
     * Processes a file and all its imports recursively to collect metadata
     * This method is exposed for external use to pre-process files before compilation
     * @param filePath Path to the TypeScript source file
     */
    public async processFileAndImportsRecursively(filePath: string): Promise<void> {
        await this.processFileAndImports(filePath);
    }

    /**
     * Processes a file and all its imports recursively to collect metadata
     * @param filePath Path to the TypeScript source file
     */
    private async processFileAndImports(filePath: string): Promise<void> {
        // Skip if already processed
        if (this.processedFiles.has(filePath)) {
            return;
        }

        this.processedFiles.add(filePath);
        if (filePath.includes('src/ts2scl/core/') || filePath.includes('src/ts2scl/utils/')) {
            return;
        }
        this.logger.debug(`Processing file and imports: ${filePath}`);

        try {
            // Create TypeScript program to analyze imports
            const { program, sourceFile } = this.createTypeScriptProgram(filePath);

            // Process imports first
            const importPaths = this.extractImportPaths(sourceFile, program);
            this.logger.debug(`Found ${importPaths.length} imports in ${filePath}`);

            // Process each import recursively in parallel
            if (importPaths.length > 0) {
                const importPromises = importPaths.map(importPath =>
                    this.processFileAndImports(importPath)
                );
                await Promise.all(importPromises);
            }

            // Collect metadata from the current file
            await this.collectMetadataFromFile(filePath);
        } catch (error) {
            this.logger.error(`Error processing file: ${filePath}`, {
                error: error instanceof Error ? error : new Error(String(error))
            });
        }
    }

    /**
     * Collects metadata from a file
     * @param filePath Path to the TypeScript source file
     */
    private async collectMetadataFromFile(filePath: string): Promise<void> {
        try {
            this.logger.debug(`Collecting metadata from file: ${filePath}`);

            // Import the file to get its exported types
            const fileUrl = this.pathToFileUrl(filePath);
            this.logger.debug(`Importing file URL: ${fileUrl}`);

            let module;
            try {
                module = await import(fileUrl);
            } catch (importError) {
                this.logger.error(`Failed to import file: ${filePath}`, {
                    error: importError instanceof Error ? importError : new Error(String(importError))
                });
                return;
            }

            let metadataCount = 0;

            // Process each exported value
            for (const [exportName, exportedValue] of Object.entries(module)) {
                if (typeof exportedValue === 'function') {
                    try {
                        const metadata = getSCLMetadata(exportedValue);
                        if (metadata && metadata.blockOptions && metadata.blockOptions.name && metadata.blockOptions.category) {
                            const blockName = metadata.blockOptions.name;
                            const blockType = metadata.blockOptions.category;
                            const metadataKey = this.createMetadataKey(blockName, blockType);

                            // Check if we already have this metadata
                            if (this.metadataRegistry.has(metadataKey)) {
                                this.logger.debug(`Metadata for ${blockType} block ${blockName} already exists, skipping`);
                                continue;
                            }

                            this.metadataRegistry.set(metadataKey, metadata);
                            metadataCount++;
                            this.logger.debug(`Collected metadata for ${blockType} block: ${blockName} from export ${exportName}`);
                        }
                    } catch (metadataError) {
                        this.logger.warn(`Failed to get metadata for export ${exportName} in file ${filePath}`, {
                            error: metadataError instanceof Error ? metadataError : new Error(String(metadataError))
                        });
                    }
                }
            }
            this.logger.info(`Collected metadata for ${metadataCount} blocks from file: ${filePath}`);

        } catch (error) {
            this.logger.error(`Failed to collect metadata from file: ${filePath}`, {
                error: error instanceof Error ? error : new Error(String(error))
            });
        }
    }

    /**
     * Gets types of a specific category from a file
     * @param filePath Path to the TypeScript source file
     * @param category The SCL category to filter by
     * @returns Array of functions representing the types
     */
    private async getTypesFromFile(filePath: string, category: SCLCategory): Promise<Function[]> {
        try {
            const fileUrl = this.pathToFileUrl(filePath);
            const module = await import(fileUrl);

            return Object.values(module)
                .filter((value): value is Function => typeof value === 'function')
                .filter(func => {
                    const metadata = getSCLMetadata(func);
                    return metadata &&
                        metadata.blockOptions &&
                        metadata.blockOptions.category === category;
                });
        } catch (error) {
            this.logger.error(`Failed to get ${category} types from file: ${filePath}`, {
                error: error instanceof Error ? error : new Error(String(error))
            });
            return [];
        }
    }

    /**
     * Extracts import paths from a source file
     * @param sourceFile The TypeScript source file
     * @param program The TypeScript program
     * @returns Array of resolved import paths
     */
    private extractImportPaths(sourceFile: ts.SourceFile, program: ts.Program): string[] {
        const importPaths: string[] = [];
        const checker = program.getTypeChecker();

        // Visit each import declaration
        ts.forEachChild(sourceFile, (node) => {
            if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
                const importPath = node.moduleSpecifier.text;


                // Skip node_modules and built-in modules
                if (importPath.startsWith('.') || importPath.startsWith('/') || importPath.includes('/src/ts2scl/core') || importPath.includes('/src/ts2scl/utils')) {
                    try {
                        // Resolve the import path relative to the source file
                        const resolvedModule = ts.resolveModuleName(
                            importPath,
                            sourceFile.fileName,
                            program.getCompilerOptions(),
                            ts.sys
                        );

                        if (resolvedModule.resolvedModule) {
                            importPaths.push(resolvedModule.resolvedModule.resolvedFileName);
                        } else {
                            this.logger.warn(`Could not resolve import: ${importPath} in ${sourceFile.fileName}`);
                        }
                    } catch (error) {
                        this.logger.warn(`Error resolving import: ${importPath} in ${sourceFile.fileName}`, {
                            error: error instanceof Error ? error : new Error(String(error))
                        });
                    }
                }
            }
        });

        return importPaths;
    }

    /**
     * Implementation of the abstract generateCode method from BaseCompiler
     * MainCompiler doesn't generate code directly, it orchestrates other compilers
     */
    public async generateCode(
        inputPath: string,
        metadata: SCLBlockMetadata,
        program: ts.Program,
        sourceFile: ts.SourceFile
    ): Promise<string> {
        throw new Error('MainCompiler does not generate code directly');
    }


    private handleCompilationError(error: unknown, inputPath: string, outputDir: string): never {
        this.logger.error('Failed to compile SCL blocks', {
            error: error instanceof Error ? error : new Error(String(error)),
            inputPath,
            outputDir,
        });
        throw error;
    }

    /**
     * Gets metadata for a block by name and type
     * @param blockName The name of the block
     * @param blockType The type of the block
     * @returns The metadata for the block, or undefined if not found
     */
    public getBlockMetadata(blockName: string, blockType: SCLCategory): SCLBlockMetadata | undefined {
        const key = this.createMetadataKey(blockName, blockType);
        return this.metadataRegistry.get(key);
    }

    /**
     * Gets metadata for a block by name, searching all block types
     * @param blockName The name of the block
     * @returns The metadata for the block, or undefined if not found
     */
    public findBlockMetadataByName(blockName: string): SCLBlockMetadata | undefined {
        // Search through all entries for a matching block name
        for (const [key, metadata] of this.metadataRegistry.entries()) {
            const { blockName: name } = this.parseMetadataKey(key);
            if (name === blockName) {
                return metadata;
            }
        }
        return undefined;
    }

    /**
     * Registers metadata for a block
     * @param blockName The name of the block
     * @param blockType The type of the block
     * @param metadata The metadata for the block
     */
    public registerBlockMetadata(blockName: string, blockType: SCLCategory, metadata: SCLBlockMetadata): void {
        const key = this.createMetadataKey(blockName, blockType);
        this.metadataRegistry.set(key, metadata);
    }

    /**
     * Gets all metadata from the registry
     * @returns A map of all block metadata
     */
    public getAllMetadata(): Map<string, SCLBlockMetadata> {
        return this.metadataRegistry;
    }

    /**
     * Gets all metadata for a specific block type
     * @param blockType The type of block to filter by
     * @returns A map of block metadata for the specified type
     */
    public getMetadataByType(blockType: SCLCategory): Map<string, SCLBlockMetadata> {
        const result = new Map<string, SCLBlockMetadata>();

        for (const [key, metadata] of this.metadataRegistry.entries()) {
            const { blockName, blockType: type } = this.parseMetadataKey(key);
            if (type === blockType) {
                result.set(blockName, metadata);
            }
        }

        return result;
    }

    /**
     * Clears the set of processed files
     * This is useful for testing and debugging
     */
    public clearProcessedFiles(): void {
        this.processedFiles.clear();
        this.logger.debug('Cleared processed files set');
    }

    /**
     * Gets the set of processed files
     * @returns The set of processed files
     */
    public getProcessedFiles(): Set<string> {
        return this.processedFiles;
    }
}
