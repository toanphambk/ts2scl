/**
 * Base Compiler Class
 * Provides common functionality for all SCL compilers.
 */

import { ASTUtils } from '../../utils/ast-utils';
import { Logger } from '../../utils/logger';
import { SCLBlockMetadata } from '../types/metadata-types';
import ts from 'typescript';
import { fileURLToPath, pathToFileURL } from 'url';
import { normalize, resolve } from 'path';
import { DecoratorUtils } from '../../utils/decorator-utils';
import { PropertyUtils } from '../../utils/property-utils';
import { MainCompiler } from '../compilers/main-compiler';

export abstract class BaseCompiler {
  protected readonly logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Generates code for a specific type without writing to file
   * @param inputPath Path to the TypeScript source file
   * @param metadata Metadata for the block
   * @param program TypeScript program
   * @param sourceFile TypeScript source file
   * @returns Generated SCL code as string
   */
  public abstract generateCode(
    inputPath: string,
    metadata: SCLBlockMetadata,
    program: ts.Program,
    sourceFile: ts.SourceFile
  ): Promise<string>;

  /**
   * Creates TypeScript program for parsing source
   */
  protected createTypeScriptProgram(inputPath: string): {
    program: ts.Program;
    sourceFile: ts.SourceFile;
  } {
    // Normalize input path to handle Windows paths correctly
    const normalizedInputPath = normalize(inputPath);

    // Get current working directory
    const cwd = process.cwd();

    // Read tsconfig.json for compiler options
    const configPath = ts.findConfigFile(
      cwd,
      ts.sys.fileExists,
      'tsconfig.json'
    );

    let compilerOptions: ts.CompilerOptions = {};
    if (configPath) {
      const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
      const parsedConfig = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        cwd
      );
      compilerOptions = parsedConfig.options;
    }

    // Create program with all source files
    // Convert the input path to a file URL if it's an absolute path
    const resolvedInputPath = resolve(normalizedInputPath);
    const program = ts.createProgram([resolvedInputPath], compilerOptions);
    const sourceFile = program.getSourceFile(resolvedInputPath);

    if (!sourceFile) {
      // Try with URL format for ESM compatibility
      const fileUrl = pathToFileURL(resolvedInputPath).href;
      console.log(`Trying with file URL: ${fileUrl}`);

      const programWithUrl = ts.createProgram([fileUrl], compilerOptions);
      const sourceFileWithUrl = programWithUrl.getSourceFile(fileUrl);

      if (!sourceFileWithUrl) {
        throw new Error(`Could not parse source file: ${resolvedInputPath}`);
      }

      return { program: programWithUrl, sourceFile: sourceFileWithUrl };
    }

    return { program, sourceFile };
  }

  public getInstanceDBMetadata(classDecl: ts.ClassDeclaration): { name: string; sclType: string; instanceType: string }[] {
    const instances = classDecl.members.
      filter(member => ts.isPropertyDeclaration(member) && DecoratorUtils.hasDecorator(member, 'Instance'))
      .map(prop => {
        const propDecl = prop as ts.PropertyDeclaration;
        const name = PropertyUtils.extractPropertyName(propDecl);
        const sclType = PropertyUtils.extractType(propDecl);
        const metadata = MainCompiler.getInstance().getBlockMetadata(name, 'FB');
        return {
          name,
          sclType: sclType ?? '',
          instanceType: metadata?.blockOptions.instanceType ?? ''
        };
      });

    return instances;
  }

  /**
   * Generates an instance DB for a given instance name and type
   */
  public generateInstanceDB(instanceName: string, instanceType: string): string {
    const sections = [
      `DATA_BLOCK "${instanceName}"`,
      'VERSION : 0.1',
      `${instanceType}`,
      'BEGIN',
      'END_DATA_BLOCK'
    ];

    return sections.join('\n');
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

  /**
   * Converts a file path to a proper file URL for ESM compatibility
   */
  protected pathToFileUrl(filePath: string): string {
    return pathToFileURL(normalize(filePath)).href;
  }

  /**
   * Converts a file URL to a file path
   */
  protected fileUrlToPath(fileUrl: string): string {
    try {
      return fileURLToPath(fileUrl);
    } catch (error) {
      // If it's not a valid URL, return the original string
      return fileUrl;
    }
  }
}
