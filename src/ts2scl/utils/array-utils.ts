import ts from 'typescript';
import { SCLPropertyOptions, ArrayDimension } from '../core/types/types';
import { DecoratorUtils } from './decorator-utils';

/**
 * Utility class for handling array-related operations in TypeScript AST.
 * Provides functionality for parsing array decorators and dimensions.
 *
 * This class centralizes all array-related parsing operations including:
 * - Array decorator extraction (@SCLArray)
 * - Array dimension parsing
 * - Array initialization handling
 *
 * @example
 * Single dimension array:
 * ```typescript
 * @SCLArray([dim(1, 10)])
 * numbers: number[];
 *  -> dimensions: [{start: 1, end: 10}]
 * ```
 *
 * Multi-dimension array:
 * ```typescript
 * @SCLArray([dim(0, 3), dim(0, 3)])
 * matrix: number[][];
 *  -> dimensions: [{start: 0, end: 3}, {start: 0, end: 3}]
 * ```
 *
 * Complex 3D array:
 * ```typescript
 * @SCLArray([dim(0, 2), dim(0, 2), dim(0, 2)])
 * cube: number[][][];
 *  -> dimensions: [
 *    {start: 0, end: 2},
 *    {start: 0, end: 2},
 *    {start: 0, end: 2}
 *  ]
 * ```
 */
export class ArrayUtils {
  /**
   * Extracts array metadata from a property declaration.
   * Gets dimension information from the array decorator.
   *
   * @param property - The property declaration to analyze
   * @returns Array metadata including dimensions
   *
   * @example
   * ```typescript
   *  Input:
   * @SCLArray([dim(0, 10)])
   * numbers: number[];
   *
   *  Output:
   * {
   *   dimensions: [{start: 0, end: 10}]
   * }
   * ```
   *
   * @example
   * ```typescript
   *  Input:
   * @SCLArray([dim(1, 3), dim(1, 3)])
   * matrix: number[][];
   *
   *  Output:
   * {
   *   dimensions: [
   *     {start: 1, end: 3},
   *     {start: 1, end: 3}
   *   ]
   * }
   * ```
   */
  static extractArrayMetadata(property: ts.PropertyDeclaration): Partial<SCLPropertyOptions> {
    return DecoratorUtils.extractArrayDimensions(property);
  }


  /**
   * Extracts array dimensions from decorator arguments
   *
   * @param args - The arguments passed to the SCLArray decorator
   * @returns Array metadata including dimensions
   *
   * @example
   * ```typescript
   *  Input: @SCLArray([dim(0, 5)])
   *  args = [[dim(0, 5)]]
   *  Output:
   * {
   *   dimensions: [{start: 0, end: 5}]
   * }
   * ```
   */
  private static extractArrayInfo(args: ts.NodeArray<ts.Expression>): Partial<SCLPropertyOptions> {
    if (args.length !== 1) return {};

    const dimensionsArg = args[0];
    if (!ts.isArrayLiteralExpression(dimensionsArg)) return {};

    const dimensions = dimensionsArg.elements
      .map((element) => this.parseDimension(element))
      .filter((dim): dim is NonNullable<typeof dim> => dim !== undefined);

    return { dimensions };
  }

  /**
   * Parses array dimension information from a dimension expression
   *
   * @param element - The expression containing dimension information
   * @returns Object containing start and end indices, or undefined if invalid
   *
   * @example
   * ```typescript
   *  Input: dim(0, 5)
   *  Output: { start: 0, end: 5 }
   *
   *  Input: dim(-10, 10)
   *  Output: { start: -10, end: 10 }
   *
   *  Input: invalidDim()
   *  Output: undefined
   * ```
   */
  private static parseDimension(element: ts.Expression): ArrayDimension | undefined {
    if (!ts.isCallExpression(element)) return undefined;
    if (!ts.isIdentifier(element.expression)) return undefined;
    if (element.expression.text !== 'dim') return undefined;

    const args = element.arguments;
    if (args.length !== 2) return undefined;

    const start = this.extractNumberFromNode(args[0]);
    const end = this.extractNumberFromNode(args[1]);

    if (start === undefined || end === undefined) return undefined;
    return { start, end };
  }

  /**
   * Extracts a number from a TypeScript expression node
   *
   * @param node - The expression node to extract from
   * @returns The extracted number or undefined if invalid
   *
   * @example
   * ```typescript
   *  Numeric literal
   *  Input: 42
   *  Output: 42
   *
   *  String literal
   *  Input: "123"
   *  Output: undefined
   *
   *  Other expressions
   *  Input: 1 + 2
   *  Output: undefined
   * ```
   */
  private static extractNumberFromNode(node: ts.Expression): number | undefined {
    if (ts.isNumericLiteral(node)) {
      return parseInt(node.text, 10);
    }
    return undefined;
  }
}
