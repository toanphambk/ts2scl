/**
 * Base Generator Class
 * Provides common functionality for all SCL code generators
 */

import ts from 'typescript';
import { Logger } from '../../utils/logger.js';
import { SCLBlockOptions, SCLPropertyOptions } from '../types/types.js';

export abstract class BaseGenerator {
  protected readonly logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }


  /**
   * Generates visibility attributes
   */
  protected generateVisibilityAttributes(options: Partial<SCLPropertyOptions>): string {
    const attributes: string[] = [];

    if (options.externalVisible === false) {
      attributes.push('ExternalVisible := \'False\'');
    }
    if (options.externalWritable === false) {
      attributes.push('ExternalWritable := \'False\'');
    }
    if (options.externalAccessible === false) {
      attributes.push('ExternalAccessible := \'False\'');
    }
    if (options.s7SetPoint === false) {
      attributes.push('S7_SetPoint := \'False\'');
    }
    if (options.s7SetPoint === true) {
      attributes.push('S7_SetPoint := \'True\'');
    }

    if (attributes.length === 0) {
      return '';
    }

    return `{ ${attributes.join('; ')} }`;
  }

  /**
   * Indents a block of code
   */
  protected indent(code: string, level: number = 1): string {
    const spaces = '    '.repeat(level);
    return code
      .split('\n')
      .map((line) => (line.trim() ? spaces + line : line))
      .join('\n');
  }

  /**
   * Wraps code in a section block
   */
  protected wrapSection(name: string, content: string): string {
    return [`${name}`, this.indent(content), `END_${name}${name === 'STRUCT' ? ';' : ''}`].join(
      '\n'
    );
  }

  /**
   * Generates block attributes section
   */
  protected generateBlockAttributes(options: SCLBlockOptions): string {
    const attributes = [];
    const { version, optimizedAccess, dbAccessibleFromOPCUA, dbAccessibleFromWebserver, unlinked, readOnly, nonRetain } = options;



    if (optimizedAccess !== undefined) {
      attributes.push(`S7_Optimized_Access := '${optimizedAccess ? 'TRUE' : 'FALSE'}'`);
    }

    if (dbAccessibleFromOPCUA !== undefined) {
      attributes.push(
        `DB_Accessible_From_OPC_UA := '${dbAccessibleFromOPCUA ? 'TRUE' : 'FALSE'}'`
      );
    }

    if (dbAccessibleFromWebserver !== undefined) {
      attributes.push(
        `DB_Accessible_From_Webserver := '${dbAccessibleFromWebserver ? 'TRUE' : 'FALSE'}'`
      );
    }


    const accessAttribute = attributes.length > 0 ? `{ ${attributes.join("; ")} }` : '';

    const optionalAttributes = [
      version && `VERSION : '${version}'`,
      unlinked && 'UNLINKED',
      readOnly && 'READ_ONLY',
      nonRetain && 'NON_RETAIN',
    ].filter(Boolean);


    return [accessAttribute, ...optionalAttributes].join('\n');
  }
}

