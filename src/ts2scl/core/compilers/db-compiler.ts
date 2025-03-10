/**
 * DataBlock Compiler
 * Compiles TypeScript classes decorated with @SCLDb into SCL data blocks
 * 
 * Example:
 * ```ts
 * @SCLDb({
 *   optimizedAccess: true,
 *   dbAccessibleFromOPCUA: true
 * })
 * class MotorControl {
 *   @Retain()
 *   currentSpeed: INT = 0;
 *   targetSpeed: INT = 1500;
 * }
 * ```
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import ts from 'typescript';
import { BaseCompiler } from '../base/base-compiler.js';
import { getSCLMetadata } from '../../utils/metadata-utils.js';
import { LogLevel } from '../../utils/logger.js';
import { DataBlockGenerator } from '../generators/db-generator.js';

/**
 * Main compiler class for converting TypeScript data blocks to SCL
 */
export class DataBlockCompiler extends BaseCompiler {
  private readonly generator: DataBlockGenerator;

  constructor() {
    super();
    this.generator = new DataBlockGenerator();
    this.logger.setLogLevel(LogLevel.DEBUG);
  }

  protected async Compile(inputPath: string, outputPath: string): Promise<void> {
    try {
      this.logger.debug('Starting datablock compilation', { inputPath });
      const { sourceFile } = this.createTypeScriptProgram(inputPath);
      const dbTypes = await this.getDBTypes(inputPath);

      for (const type of dbTypes) {
        const metadata = getSCLMetadata(type);
        const blockName = this.validateBlockName(metadata, type);
        const blockContent = this.generateBlockContent(type, sourceFile);
        const blockOutputPath = resolve(outputPath, `${blockName}.db`);

        writeFileSync(blockOutputPath, blockContent, 'utf8');
        this.logger.info('Successfully wrote data block file', { blockName, outputPath: blockOutputPath });
      }
    } catch (error) {
      this.handleCompilationError(error, inputPath, outputPath);
    }
  }

  private handleCompilationError(error: unknown, inputPath: string, outputPath: string): never {
    this.logger.error('Failed to compile datablocks', {
      error: error instanceof Error ? error : new Error(String(error)),
      inputPath,
      outputPath,
    });
    throw error;
  }

  private generateBlockContent(type: Function, sourceFile: ts.SourceFile): string {
    try {
      const metadata = getSCLMetadata(type);
      const typeName = this.validateBlockName(metadata, type);
      const classDeclaration = this.getClassDeclaration(sourceFile, typeName);

      return this.generator.sclContentParse(metadata, classDeclaration);
    } catch (error) {
      this.logger.error('Failed to generate block', {
        error: error instanceof Error ? error : new Error(String(error)),
        typeName: (type as { name?: string })?.name ?? 'unknown',
      });
      throw error;
    }
  }

  protected async getDBTypes(inputTypesDir: string): Promise<Function[]> {
    try {
      const fileUrl = this.pathToFileUrl(inputTypesDir);

      this.logger.debug(`Importing from URL: ${fileUrl}`);

      let inputTypes;
      try {
        inputTypes = await import(fileUrl);
      } catch (error) {
        this.logger.error('Error importing module', {
          error: error instanceof Error ? error : new Error(String(error)),
          fileUrl,
        });
        throw error;
      }

      const dbTypes = Object.values(inputTypes).filter(this.isDBType);
      this.logger.debug(`Found ${dbTypes.length} DB types`);

      return dbTypes;
    } catch (error) {
      this.logger.error('Failed to get DB types', {
        error: error instanceof Error ? error : new Error(String(error)),
        inputTypesDir,
      });
      throw error;
    }
  }

  private isDBType(value: unknown): value is Function {
    if (typeof value !== 'function') return false;
    const metadata = getSCLMetadata(value);
    return metadata.blockOptions?.category === 'DB';
  }
}
