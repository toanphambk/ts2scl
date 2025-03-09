/**
 * Type Compiler
 * Compiles TypeScript classes decorated with @SCLType into SCL user-defined types
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import ts from 'typescript';
import { BaseCompiler } from '../base/base-compiler.js';
import { TypeGenerator } from '../generators/type-generator.js';
import { getSCLMetadata } from '../../utils/metadata-utils.js';
import { LogLevel } from '../../utils/logger.js';

/**
 * Main compiler class for converting TypeScript types to SCL
 */
export class TypeCompiler extends BaseCompiler {
  private readonly generator: TypeGenerator;

  constructor() {
    super();
    this.generator = new TypeGenerator();
    this.logger.setLogLevel(LogLevel.DEBUG);
  }

  protected async Compile(inputPath: string, outputPath: string): Promise<void> {
    try {
      this.logger.debug('Starting type compilation', { inputPath });


      const { sourceFile } = this.createTypeScriptProgram(inputPath);
      const udtTypes = await this.getUDTTypes(inputPath);

      for (const type of udtTypes) {
        const metadata = getSCLMetadata(type);
        const typeName = this.validateBlockName(metadata, type);
        const typeContent = this.generateTypeContent(type, sourceFile);
        const typeOutputPath = resolve(outputPath, `${typeName}.udt`);

        writeFileSync(typeOutputPath, typeContent, 'utf8');
        this.logger.info('Successfully wrote type file', { typeName, outputPath: typeOutputPath });
      }
    } catch (error) {
      this.handleCompilationError(error, inputPath, outputPath);
    }
  }

  private handleCompilationError(error: unknown, inputPath: string, outputPath: string): never {
    this.logger.error('Failed to compile types', {
      error: error instanceof Error ? error : new Error(String(error)),
      inputPath,
      outputPath,
    });
    throw error;
  }

  private generateTypeContent(type: Function, sourceFile: ts.SourceFile): string {
    try {
      const metadata = getSCLMetadata(type);
      const typeName = this.validateBlockName(metadata, type);
      const classDeclaration = this.getClassDeclaration(sourceFile, typeName);

      return this.generator.sclContentParse(metadata, classDeclaration);
    } catch (error) {
      this.logger.error('Failed to generate type', {
        error: error instanceof Error ? error : new Error(String(error)),
        typeName: (type as { name?: string })?.name ?? 'unknown',
      });
      throw error;
    }
  }

  protected async getUDTTypes(inputTypesDir: string): Promise<Function[]> {
    try {
      const inputTypes = await import(inputTypesDir);
      return Object.values(inputTypes).filter(this.isUDTType);
    } catch (error) {
      this.logger.error('Failed to get UDT types', {
        error: error instanceof Error ? error : new Error(String(error)),
        inputTypesDir,
      });
      throw error;
    }
  }

  private isUDTType(value: unknown): value is Function {
    if (typeof value !== 'function') return false;
    const metadata = getSCLMetadata(value);
    return metadata.blockOptions?.category === 'UDT';
  }
}
