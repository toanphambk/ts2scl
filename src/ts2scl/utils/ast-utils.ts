import * as ts from 'typescript';
import { SCLPropertyOptions } from '../core/types/types';
import { TypeExtractor } from './type-extractor';
import { PropertyUtils } from './property-utils';
import { NodeUtils } from './node-utils';

/**
 * Core utility class for working with TypeScript AST nodes.
 * Provides functionality for traversing and analyzing TypeScript Abstract Syntax Trees,
 * with specialized operations delegated to other utility classes.
 */
export class ASTUtils {
  /**
   * Finds the implementation of a static 'process' method in a specified class within a source file.
   *
   * @param sourceFile - The TypeScript source file to search in
   * @param className - The name of the class containing the method
   * @returns The method declaration if found, undefined otherwise
   */
  static getFunctionImplementation(
    sourceFile: ts.SourceFile | undefined,
    className: string
  ): ts.MethodDeclaration | undefined {
    const classDecl = NodeUtils.findClassDeclaration(sourceFile, className);
    if (!classDecl) return undefined;

    return NodeUtils.findMethodInClass(classDecl, 'process', [ts.SyntaxKind.StaticKeyword]);
  }

  /**
   * Retrieves the class declaration for a specified class name from a source file.
   *
   * @param sourceFile - The TypeScript source file to search in
   * @param className - The name of the class to find
   * @returns The class declaration
   * @throws Error if the source file is undefined or the class is not found
   */
  static getClassesDeclaration(
    sourceFile: ts.SourceFile | undefined,
    className: string
  ): ts.ClassDeclaration {
    const classDecl = NodeUtils.findClassDeclaration(sourceFile, className);
    if (!classDecl) {
      throw new Error(`Could not find class declaration for UDT '${className}'`);
    }
    return classDecl;
  }

  /**
   * Gets all initialization statements from a constructor.
   * 
   * @param node - TypeScript class declaration
   * @param indent - Function to indent the generated code
   * @returns Array of SCL initialization statements
   */
  static getConstructorInitializations(node: ts.ClassDeclaration, indent: (str: string) => string): string[] {
    const constructor = node.members.find(ts.isConstructorDeclaration) as ts.ConstructorDeclaration;
    if (!constructor?.body) return [];

    return constructor.body.statements
      .filter(ts.isExpressionStatement)
      .map(stmt => this.processAssignment(stmt, indent))
      .filter((init): init is string => init !== null);
  }

  /**
   * Gets all property initializations from a class.
   * 
   * @param node - TypeScript class declaration
   * @param indent - Function to indent the generated code
   * @returns Array of SCL initialization statements
   */
  static getPropertyInitializations(node: ts.ClassDeclaration, indent: (str: string) => string): string[] {
    return node.members
      .filter(ts.isPropertyDeclaration)
      .map(prop => {
        if (!prop.initializer || !ts.isIdentifier(prop.name)) return null;

        const propertyName = prop.name.text;
        const value = TypeExtractor.extractValue(prop.initializer);

        return value ? indent(`${propertyName} := ${value};`) : null;
      })
      .filter((init): init is string => init !== null);
  }

  /**
   * Processes a TypeScript assignment statement and converts it to SCL format.
   * Handles different types of assignments: array access, property access, and simple assignments.
   * 
   * @param stmt - TypeScript expression statement to process
   * @param indent - Function to indent the generated code
   * @returns SCL assignment statement or null if not a valid assignment
   */
  private static processAssignment(stmt: ts.ExpressionStatement, indent: (str: string) => string): string | null {
    if (!ts.isBinaryExpression(stmt.expression) ||
      stmt.expression.operatorToken.kind !== ts.SyntaxKind.EqualsToken) {
      return null;
    }

    const { left, right } = stmt.expression;
    const value = TypeExtractor.extractValue(right);
    if (!value) return null;

    if (ts.isElementAccessExpression(left)) {
      return this.processArrayAssignment(left, value, indent);
    }

    if (ts.isPropertyAccessExpression(left)) {
      return this.processPropertyAssignment(left, value, indent);
    }

    if (ts.isIdentifier(left)) {
      return this.processSimpleAssignment(left, value, indent);
    }

    return null;
  }

  /**
   * Processes a simple variable assignment (no array or property access).
   */
  private static processSimpleAssignment(left: ts.Identifier, value: string, indent: (str: string) => string): string {
    return indent(`${left.text} := ${value};`);
  }

  /**
   * Processes an array element assignment.
   */
  private static processArrayAssignment(left: ts.ElementAccessExpression, value: string, indent: (str: string) => string): string | null {
    const result = PropertyUtils.processArrayAccess(left, expr => TypeExtractor.extractValue(expr) ?? null);
    return result ? indent(`${result.path}[${result.index}] := ${value};`) : null;
  }

  /**
   * Processes a property access assignment.
   */
  private static processPropertyAssignment(left: ts.PropertyAccessExpression, value: string, indent: (str: string) => string): string {
    const propertyPath = PropertyUtils.extractPropertyPath(left);
    return indent(`${propertyPath} := ${value};`);
  }
}
