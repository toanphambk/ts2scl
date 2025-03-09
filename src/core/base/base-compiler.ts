/**
 * Base Compiler Class
 * Provides common functionality for all SCL compilers.
 */

import { ASTUtils } from '../../utils/ast-utils';
import { Logger } from '../../utils/logger';
import { SCLBlockMetadata } from '../types/metadata-types';
import ts from 'typescript';

export abstract class BaseCompiler {
  protected readonly logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Main compilation method template
   */
  public async compile(inputPath: string, outputPath: string): Promise<boolean> {
    try {
      await this.Compile(inputPath, outputPath);

      this.logger.info('Compilation completed successfully');
      return true;
    } catch (error) {
      this.logger.error('Compilation failed', { message: (error as Error).message });
      return false;
    }
  }

  /**
   * Abstract method to be implemented by specific compilers
   */
  protected abstract Compile(inputPath: string, outputPath: string): Promise<void>;

  /**
   * Creates TypeScript program for parsing source
   */
  protected createTypeScriptProgram(inputPath: string): {
    program: ts.Program;
    sourceFile: ts.SourceFile;
  } {
    // Read tsconfig.json for compiler options
    const configPath = ts.findConfigFile(
      process.cwd(),
      ts.sys.fileExists,
      'tsconfig.json'
    );

    let compilerOptions: ts.CompilerOptions = {};
    if (configPath) {
      const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
      const parsedConfig = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        process.cwd()
      );
      compilerOptions = parsedConfig.options;
    }

    // Create program with all source files
    const program = ts.createProgram([inputPath], compilerOptions);
    const sourceFile = program.getSourceFile(inputPath);

    if (!sourceFile) {
      throw new Error('Could not parse source file');
    }

    return { program, sourceFile };
  }

  /**
   * Validates and normalizes block metadata
   */
  protected validateMetadata(metadata: SCLBlockMetadata): void {
    if (!metadata.blockOptions?.name) {
      throw new Error('Missing name in metadata');
    }
    if (!metadata.blockOptions?.category) {
      throw new Error('Missing category in metadata');
    }
  }

  /**
   * Validates and returns block name from metadata
   */
  protected validateBlockName(metadata: SCLBlockMetadata, type: any): string {
    const blockName = metadata.blockOptions?.name;
    if (!blockName) {
      throw new Error(`No block name found for type ${type}`);
    }
    return blockName;
  }

  /**
   * Gets class declaration from source file
   */
  protected getClassDeclaration(sourceFile: ts.SourceFile, className: string): ts.ClassDeclaration {
    const classDeclaration = ASTUtils.getClassesDeclaration(sourceFile, className);
    if (!classDeclaration) {
      throw new Error(`No class declaration found for ${className}`);
    }
    return classDeclaration;
  }

}
