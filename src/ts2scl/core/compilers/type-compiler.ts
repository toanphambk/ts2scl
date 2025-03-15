/**
 * Type Compiler
 * Compiles TypeScript classes decorated with @SCLType into SCL user-defined types
 */

import ts from 'typescript';
import { BaseCompiler } from '../base/base-compiler.js';
import { TypeGenerator } from '../generators/type-generator.js';
import { getSCLMetadata } from '../../utils/metadata-utils.js';
import { LogLevel } from '../../utils/logger.js';
import { SCLBlockMetadata } from '../types/metadata-types.js';

/**
 * Main compiler class for converting TypeScript types to SCL
 */
export class TypeCompiler extends BaseCompiler {
  private static instance: TypeCompiler;
  private readonly generator: TypeGenerator;

  private constructor() {
    super();
    this.generator = new TypeGenerator();
    this.logger.setLogLevel(LogLevel.DEBUG);
  }

  /**
   * Gets the singleton instance of TypeCompiler
   * @returns The singleton instance
   */
  public static getInstance(): TypeCompiler {
    if (!TypeCompiler.instance) {
      TypeCompiler.instance = new TypeCompiler();
    }
    return TypeCompiler.instance;
  }

  /**
   * Generates SCL code for a UDT type
   * @param inputPath Path to the TypeScript source file
   * @param metadata Metadata for the UDT
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
      this.logger.debug('Generating UDT code', { typeName: metadata.blockOptions.name });
      const typeName = metadata.blockOptions.name;
      const classDeclaration = this.getClassDeclaration(sourceFile, typeName);
      return this.generator.sclContentParse(metadata, classDeclaration);
    } catch (error) {
      this.logger.error('Failed to generate UDT code', {
        error: error instanceof Error ? error : new Error(String(error)),
        typeName: metadata.blockOptions.name
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
