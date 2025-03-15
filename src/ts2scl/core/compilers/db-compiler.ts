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

import ts from 'typescript';
import { BaseCompiler } from '../base/base-compiler.js';
import { getSCLMetadata } from '../../utils/metadata-utils.js';
import { LogLevel } from '../../utils/logger.js';
import { DataBlockGenerator } from '../generators/db-generator.js';
import { SCLBlockMetadata } from '../types/metadata-types.js';

/**
 * Main compiler class for converting TypeScript data blocks to SCL
 */
export class DataBlockCompiler extends BaseCompiler {
  private static instance: DataBlockCompiler;
  private readonly generator: DataBlockGenerator;

  private constructor() {
    super();
    this.generator = new DataBlockGenerator();
    this.logger.setLogLevel(LogLevel.DEBUG);
  }

  /**
   * Gets the singleton instance of DataBlockCompiler
   * @returns The singleton instance
   */
  public static getInstance(): DataBlockCompiler {
    if (!DataBlockCompiler.instance) {
      DataBlockCompiler.instance = new DataBlockCompiler();
    }
    return DataBlockCompiler.instance;
  }

  /**
   * Generates SCL code for a data block
   * @param inputPath Path to the TypeScript source file
   * @param metadata Metadata for the data block
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
      this.logger.debug('Generating data block code', { blockName: metadata.blockOptions.name });
      const blockName = metadata.blockOptions.name;
      const classDeclaration = this.getClassDeclaration(sourceFile, blockName);
      return this.generator.sclContentParse(metadata, classDeclaration);
    } catch (error) {
      this.logger.error('Failed to generate data block code', {
        error: error instanceof Error ? error : new Error(String(error)),
        blockName: metadata.blockOptions.name
      });
      throw error;
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
