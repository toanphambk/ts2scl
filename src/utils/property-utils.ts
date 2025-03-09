import * as ts from 'typescript';
import { SCLPropertyOptions, SCLTypeEnum } from '../core/types/types';
import { TypeExtractor } from './type-extractor';
import { NodeUtils } from './node-utils';
import { DecoratorUtils } from './decorator-utils';
import { getPropertyMetadata } from './metadata-utils';


/**
 * Utility class for handling property-related operations in TypeScript AST.
 * Provides functionality for parsing property modifiers, decorators, and
 * extracting property metadata for SCL compilation.
 *
 * This class handles various property aspects including:
 * - Access modifiers (public, private, protected)
 * - Readonly modifier
 * - Property name and type resolution
 * - Property initialization values
 * - Output parameter detection
 *
 * @example
 * Basic property with access modifiers:
 * ```typescript
 * public myProp: string;
 *  -> {
 *    externalAccessible: true,
 *    externalVisible: true,
 *    externalWritable: true
 *  }
 * ```
 *
 * Property with initializer:
 * ```typescript
 * private readonly count: number = 42;
 *  -> {
 *    externalAccessible: false,
 *    externalVisible: false,
 *    externalWritable: false,
 *    initialValue: "42"
 *  }
 * ```
 *
 * Property with type and array:
 * ```typescript
 * @SCLArray([dim(0, 10)])
 * protected values: number[] = [1, 2, 3];
 *  -> {
 *    externalAccessible: true,
 *    externalVisible: true,
 *    externalWritable: false,
 *    dimensions: [{start: 0, end: 10}],
 *    initialValue: "1,2,3"
 *  }
 * ```
 *
 * Output parameter:
 * ```typescript
 * function process(@Output() result: number) {
 *    Parameter marked as output
 * }
 * ```
 */

export class PropertyUtils {
  /**
   * Parses the scope and visibility information from a property declaration.
   * Combines modifier information with array decorator metadata.
   *
   * @param property - The property declaration to analyze
   * @returns Partial SCLPropertyOptions containing scope and array information
   *
   * @example
   * ```typescript
   *  Public property
   * public value: number;
   *  -> {
   *    externalAccessible: true,
   *    externalVisible: true,
   *    externalWritable: true
   *  }
   *
   *  Protected array property
   * @SCLArray([dim(0, 5)])
   * protected items: string[];
   *  -> {
   *    externalAccessible: true,
   *    externalVisible: true,
   *    externalWritable: false,
   *    dimensions: [{start: 0, end: 5}]
   *  }
   * ```
   */
  static parsePropertyParameter(property: ts.PropertyDeclaration): SCLPropertyOptions {
    const name = this.extractPropertyName(property);
    const sclType = this.extractType(property);
    const retain = DecoratorUtils.extractRetainMetadata(property);
    const scope = DecoratorUtils.extractScopeMetadata(property);
    const arrayMetadata = DecoratorUtils.extractArrayDimensions(property);
    const initValue = this.extractInitializerValue(property);
    const instanceType = DecoratorUtils.extractInstanceType(property);
    return { ...retain, ...scope, ...arrayMetadata, name, sclType, initValue, instanceType };
  }

  /**
   * Determines if a parameter is marked with the Output decorator.
   * Used to identify output parameters in function declarations.
   *
   * @param paramDec - The parameter declaration to check
   * @returns True if the parameter is marked as an output parameter
   *
   * @example
   * ```typescript
   *  Output parameter
   * function process(@Output() result: number) {}
   *  -> true
   *
   *  Regular parameter
   * function process(input: string) {}
   *  -> false
   *
   *  Invalid decorator
   * function process(@Input() value: boolean) {}
   *  -> false
   * ```
   */
  static isOutputParameter(paramDec: ts.ParameterDeclaration): boolean {
    return DecoratorUtils.hasDecorator(paramDec, 'Output');
  }

  static extractScopeMetaData(property: ts.PropertyDeclaration): Partial<SCLPropertyOptions> {
    return DecoratorUtils.extractScopeMetadata(property);
  }

  static extractRetainMetadata(property: ts.PropertyDeclaration): Partial<SCLPropertyOptions> {
    return DecoratorUtils.extractRetainMetadata(property);
  }

  /**
   * Gets the name of a property declaration
   *
   * @param propertyNode - The property declaration to get name from
   * @returns The property name as a string
   *
   * @example
   * ```typescript
   *  Identifier name
   * myProperty: string;
   *  -> "myProperty"
   *
   *  String literal name
   * "special-name": number;
   *  -> "special-name"
   *
   *  Computed name
   * [getPropertyName()]: boolean;
   *  -> Result of getPropertyName()
   * ```
   */
  static extractPropertyName(propertyNode: ts.PropertyDeclaration): string {
    if (!propertyNode.name) {
      throw new Error('Property name is undefined');
    }

    if (ts.isIdentifier(propertyNode.name) || ts.isStringLiteral(propertyNode.name)) {
      return propertyNode.name.text;
    }
    return propertyNode.name.getText();
  }

  /**
   * Gets the SCL type name for a property
   *
   * @param propertyNode - The property declaration to get type from
   * @returns The SCL type name as a string
   *
   * @example
   * ```typescript
   *  Basic types
   * value: boolean;
   *  -> "BOOL"
   *
   * count: number;
   *  -> "INT"
   *
   *  Array type
   * items: string[];
   *  -> "STRING"
   *
   *  Custom type
   * config: Config;
   *  -> "\"Config\""
   *
   *  Branded type
   * id: UserId;
   *  -> "\"UserId\""
   * ```
   */
  static extractType(propertyNode: ts.PropertyDeclaration): string {
    if (!propertyNode.type) {
      throw new Error(`No type information found for property ${propertyNode.name.getText()}`);
    }

    // Try to extract branded type first
    const brandedType = TypeExtractor.extractBrandedType(propertyNode.type);
    if (brandedType) {
      return PropertyUtils.formatTypeName(brandedType);
    }

    // Handle array types
    if (ts.isArrayTypeNode(propertyNode.type)) {
      return PropertyUtils.extractArrayType(propertyNode);
    }

    // Handle regular types
    const typeName = NodeUtils.extractTypeName(propertyNode.type);
    if (typeName) {
      return PropertyUtils.formatTypeName(typeName);
    }

    throw new Error(`Could not determine type for property ${propertyNode.name.getText()}`);
  }





  private static extractArrayType(propertyNode: ts.PropertyDeclaration): string {
    const baseType = NodeUtils.getArrayBaseType(propertyNode.type as ts.ArrayTypeNode);
    const typeName = NodeUtils.extractTypeName(baseType);

    if (!typeName) {
      throw new Error(`Could not determine array base type for property ${propertyNode.name.getText()}`);
    }

    const formattedTypeName = PropertyUtils.formatTypeName(typeName);
    const { dimensions } = DecoratorUtils.extractArrayDimensions(propertyNode);

    if (!dimensions) {
      return formattedTypeName;
    }

    const dimensionsString = dimensions
      .map(dim => `${dim.start}..${dim.end}`)
      .join(',');

    return `ARRAY[${dimensionsString}] OF ${formattedTypeName}`;
  }

  /**
   * Gets the initialization value for a property
   *
   * @param propertyNode - The property declaration to get initializer from
   * @returns The formatted initialization value string
   *
   * @example
   * ```typescript
   *  Boolean initializer
   * enabled: boolean = true;
   *  -> " := TRUE"
   *
   *  Numeric initializer
   * count: number = 42;
   *  -> " := 42"
   *
   *  String initializer
   * name: string = "test";
   *  -> " := 'test'"
   *
   *  Array initializer
   * values: number[] = [1, 2, 3];
   *  -> " := 1,2,3"
   *
   *  No initializer
   * status: boolean;
   *  -> ""
   * ```
   */
  static extractInitializerValue(propertyNode: ts.PropertyDeclaration): string {
    if (!propertyNode.initializer) {
      return '';
    }

    const result = TypeExtractor.extractValue(propertyNode.initializer);
    return result ? ` := ${result}` : '';
  }

  /**
   * Formats a type name according to SCL conventions
   *
   * @param typeName - The type name to format
   * @returns The formatted type name
   *
   * @example
   * ```typescript
   *  Basic types
   * "BOOL" -> "BOOL"
   * "INT" -> "INT"
   * "REAL" -> "REAL"
   * "STRING" -> "STRING"
   * "TIME" -> "TIME"
   *
   *  Custom types
   * "Config" -> "\"Config\""
   * "UserType" -> "\"UserType\""
   * ```
   */
  public static formatTypeName(typeName: string): string {
    const isBuiltInType = Object.values(SCLTypeEnum).includes(typeName as SCLTypeEnum);

    // Built-in SCL types don't need quotes, custom types do
    return isBuiltInType ? typeName : `"${typeName}"`;
  }

  /**
   * Extracts a dot-separated property path from a property access chain.
   * Handles nested property access and resolves the base identifier.
   * 
   * @param expr - TypeScript expression representing property access
   * @returns Dot-separated property path string
   * 
   * @example
   * ```ts
   * // Input expressions:
   * this.config.value
   * this.config.subconfig.mode
   * 
   * // Output paths:
   * 'config.value'
   * 'config.subconfig.mode'
   * ```
   */
  public static extractPropertyPath(expr: ts.Expression): string {
    const path: string[] = [];
    let current: ts.Expression = expr;

    while (ts.isPropertyAccessExpression(current)) {
      path.unshift(current.name.text);
      current = current.expression;
    }

    if (ts.isIdentifier(current)) {
      path.unshift(current.text);
    }

    return path.join('.');
  }


  /**
   * Processes an array element access expression.
   * Handles nested property access for array paths.
   * 
   * @param expr - TypeScript element access expression
   * @param extractValue - Function to extract value from expression
   * @returns Object containing array path and index value, or null if invalid
   * 
   * @example
   * ```ts
   * // Input:
   * this.array[0]
   * this.config.array[1]
   * 
   * // Output:
   * { path: 'array', index: '0' }
   * { path: 'config.array', index: '1' }
   * ```
   */
  public static processArrayAccess(expr: ts.ElementAccessExpression, extractValue: (expr: ts.Expression) => string | null): { path: string; index: string } | null {
    const arrayPath = this.extractPropertyPath(expr.expression);
    const indexValue = extractValue(expr.argumentExpression);

    return indexValue ? { path: arrayPath, index: indexValue } : null;
  }

}
