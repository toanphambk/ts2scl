import ts from 'typescript';
import { BaseGenerator } from '../base/base-generator.js';
import { SCLBlockMetadata } from '../types/metadata-types.js';
import { PropertyUtils } from '../../utils/property-utils.js';


export class TypeGenerator extends BaseGenerator {
  constructor() {
    super();
  }

  public sclContentParse(metadata: SCLBlockMetadata, node: ts.ClassDeclaration): string {
    this.validateNode(node);
    console.log(metadata.blockOptions);

    return [
      this.generateBlockAttributes(metadata.blockOptions),
      `TYPE "${metadata.blockOptions.name}"`,
      this.wrapSection('STRUCT', this.generateProperties(node)),
      'END_TYPE',
    ].join('\n');
  }

  private validateNode(node: ts.ClassDeclaration): void {
    if (!node.name || !ts.isIdentifier(node.name)) {
      throw new Error('Class has no name or is not an identifier');
    }
  }

  private generateProperties(node: ts.ClassDeclaration): string {
    return node.members
      .filter(ts.isPropertyDeclaration)
      .map((property) => this.processProperty(property))
      .filter((result): result is string => result !== null)
      .join('\n');
  }

  private processProperty(propertyNode: ts.PropertyDeclaration): string {
    const propertyParameter = PropertyUtils.parsePropertyParameter(propertyNode);
    return `    ${propertyParameter.name} : ${propertyParameter.sclType}${propertyParameter.initValue};`;
  }
}
