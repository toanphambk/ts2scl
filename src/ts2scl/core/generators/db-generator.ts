/**
 * DataBlock Generator
 * Generates SCL data blocks from TypeScript class definitions decorated with @SCLDb
 * 
 * This class is responsible for generating SCL data block definitions from TypeScript classes.
 * It handles:
 * - Block attributes and properties
 * - Variable sections (standard and retained)
 * - Initialization values
 * 
 * Example usage:
 * ```ts
 * // Define a TypeScript class with @SCLDb decorator
 * @SCLDb({
 *   optimizedAccess: true,
 *   dbAccessibleFromOPCUA: true
 * })
 * class MotorControl {
 *   @Retain()
 *   currentSpeed: INT = 0;
 *   
 *   targetSpeed: INT = 1500;
 *   
 *   @SCLArray([dim(0, 9)])
 *   speedHistory: INT[] = [];
 * }
 * 
 * // Generate SCL code
 * const generator = new DataBlockGenerator();
 * const scl = generator.sclContentParse(metadata, classDeclaration);
 * 
 * // Result:
 * DATA_BLOCK "MotorControl"
 * { S7_Optimized_Access := 'TRUE',
 *   DB_Accessible_From_OPC_UA := 'TRUE' }
 * 
 * VAR
 *   targetSpeed : INT;
 *   speedHistory : ARRAY[0..9] OF INT;
 * END_VAR
 * 
 * VAR RETAIN
 *   currentSpeed : INT;
 * END_VAR
 * 
 * BEGIN
 *   currentSpeed := 0;
 *   targetSpeed := 1500;
 * END_DATA_BLOCK
 * ```
 */

import ts from 'typescript';
import { BaseGenerator } from '../base/base-generator.js';
import { SCLBlockMetadata } from '../types/metadata-types.js';
import { SCLPropertyOptions } from '../types/types.js';
import { SCLSectionGenerator } from './component/section-generator.js';
import { PropertyUtils } from '../../utils/property-utils.js';
import { ASTUtils } from '../../utils/ast-utils.js';

export class DataBlockGenerator extends BaseGenerator {
  private readonly sectionGenerator: SCLSectionGenerator;

  constructor() {
    super();
    this.sectionGenerator = new SCLSectionGenerator();
  }

  /**
   * Generates a complete SCL data block definition from a TypeScript class.
   * This is the main entry point for generating SCL code.
   * 
   * @param metadata - Block metadata containing options and properties
   * @param node - TypeScript class declaration node
   * @returns Generated SCL data block definition as a string
   * 
   * @example
   * ```ts
   * const metadata = {
   *   blockOptions: {
   *     name: "MotorControl",
   *     optimizedAccess: true
   *   }
   * };
   * const scl = generator.sclContentParse(metadata, classDeclaration);
   * ```
   */
  public sclContentParse(metadata: SCLBlockMetadata, node: ts.ClassDeclaration): string {
    this.validateNode(node);

    const initSection = this.generateInitializationSection(node);
    const sections = [
      `DATA_BLOCK "${metadata.blockOptions.name}"`,
      this.generateBlockAttributes(metadata.blockOptions),
      this.generateVariableSections(node)
    ];

    if (initSection) {
      sections.push(initSection);
    }

    sections.push('END_DATA_BLOCK');
    return sections.join('\n');
  }

  /**
   * Validates that the class declaration has a valid name.
   * 
   * @param node - TypeScript class declaration to validate
   * @throws Error if the class has no name or invalid identifier
   */
  private validateNode(node: ts.ClassDeclaration): void {
    if (!node.name || !ts.isIdentifier(node.name)) {
      throw new Error('Class has no name or is not an identifier');
    }
  }

  /**
   * Generates all variable sections for the data block.
   * Processes class properties and splits them into standard and retained sections.
   * 
   * @param node - TypeScript class declaration containing properties
   * @param blockOptions - Block-level options affecting variable sections
   * @returns Generated variable sections as a string
   * 
   * @example
   * ```ts
   * // Input class:
   * class Example {
   *   @Retain()
   *   value: INT = 0;
   *   count: INT = 1;
   * }
   * 
   * // Generated sections:
   * VAR
   *   count : INT;
   * END_VAR
   * 
   * VAR RETAIN
   *   value : INT;
   * END_VAR
   * ```
   */
  private generateVariableSections(node: ts.ClassDeclaration): string {
    const properties = node.members
      .filter(ts.isPropertyDeclaration)
      .map(prop => {
        return PropertyUtils.parsePropertyParameter(prop);
      });

    const { retainedProps, nonRetainedProps } = this.splitProperties(properties);

    const sections: string[] = [];

    // Generate standard VAR section
    if (nonRetainedProps.length > 0) {
      sections.push(this.sectionGenerator.generateSclContent('VAR', nonRetainedProps));
    }

    // Generate VAR RETAIN section
    if (retainedProps.length > 0) {
      sections.push(this.sectionGenerator.generateSclContent('VAR RETAIN', retainedProps));
    }

    return sections.join('\n\n');
  }

  /**
   * Generates the initialization section with initial values from both property initializers and constructor.
   * This method combines both property-level initializations and constructor assignments into a single SCL initialization block.
   * 
   * @param node - TypeScript class declaration to process
   * @returns Generated SCL initialization section as a string, or empty string if no initializations
   */
  private generateInitializationSection(node: ts.ClassDeclaration): string {
    const initializations = [
      ...ASTUtils.getConstructorInitializations(node, this.indent)
    ];

    if (initializations.length === 0) return '';

    return [
      'BEGIN',
      ...initializations
    ].join('\n');
  }

  /**
   * Splits properties into retained and non-retained groups.
   * 
   * @param properties - Array of property name and options pairs
   * @param isNonRetain - Whether the block is marked as non-retain
   * @returns Object containing retained and non-retained property arrays
   */
  private splitProperties(properties: Partial<SCLPropertyOptions>[]) {
    return properties.reduce(
      (acc, property) => {
        if (property.retain) {
          acc.retainedProps.push(property);
        } else {
          acc.nonRetainedProps.push(property);
        }
        return acc;
      },
      {
        retainedProps: [] as Partial<SCLPropertyOptions>[],
        nonRetainedProps: [] as Partial<SCLPropertyOptions>[],
      }
    );
  }
}
