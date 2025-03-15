import * as ts from 'typescript';
import { BaseGenerator } from '../../base/base-generator.js';
import { NodeUtils } from '../../../utils/node-utils.js';
import { PropertyUtils } from '../../../utils/property-utils.js';
import { TypeExtractor } from '../../../utils/type-extractor.js';
import { SCLTypeEnum } from '../../types/types.js';
import { getPropertyMetadata, getSCLMetadata } from '../../../utils/metadata-utils.js';
import { METADATA_KEYS } from '../../types/metadata-types.js';
import { DecoratorUtils } from '../../../utils/decorator-utils.js';
import { FunctionBlockCompiler } from '../../compilers/fb-compiler.js';
import { MainCompiler } from '../../compilers/main-compiler.js';
import { SCLCategory } from '../../types/types';
/*==============================================================================
  TYPES & CONFIGURATIONS
==============================================================================*/

/**
 * Maps a TypeScript syntax kind to its SCL generator.
 */
interface ExpressionHandler {
    kind: ts.SyntaxKind;
    handler: (node: ts.Expression) => string;
}

/**
 * SCL operator precedence.
 */
enum OperatorPrecedence {
    Brackets = 1,
    Dereference = 1,
    UnaryOperators = 2,
    PowerAndNot = 3,
    Multiplicative = 4,
    Additive = 5,
    Relational = 6,
    Equality = 7,
    LogicalAnd = 8,
    LogicalXor = 9,
    LogicalOr = 10,
    Assignment = 11,
}

/**
 * Assignment types in SCL.
 */
enum AssignmentType {
    Simple = 'Simple',
    Multiple = 'Multiple',
    Combined = 'Combined',
}

/**
 * Information for a combined assignment operator.
 */
interface CombinedAssignmentInfo {
    operator: string;
    precedence: OperatorPrecedence;
}

/**
 * SCL data type configuration.
 */
interface DataTypeConfig {
    type: string;
    allowedAssignments: AssignmentType[];
    requiresTypeCheck: boolean;
    validateAssignment?: (left: ts.Expression, right: ts.Expression) => boolean | undefined;
}

/**
 * An assignment operation to be generated.
 */
interface AssignmentOperation {
    left: string;
    right: string;
    operator: string;
    type: AssignmentType;
    leftNode: ts.Expression;
    rightNode: ts.Expression;
}

/**
 * Mapping TS operator to SCL equivalent.
 */
interface OperatorInfo {
    sclOperator: string;
    precedence: OperatorPrecedence;
    isRightAssociative?: boolean;
}

/**
 * Type conversion configuration.
 */
interface TypeConversionConfig {
    prefixes: string[];
    targets: string[];
}

/**
 * Overall SCL configuration.
 */
const SCL_CONFIG = {
    typeConversion: { prefixes: ['to'], targets: ['BOOL', 'INT', 'REAL', 'STRING', 'TIME', 'WORD'] } as TypeConversionConfig,
    rightAssociativeOperators: [OperatorPrecedence.PowerAndNot, OperatorPrecedence.Assignment],
} as const;

/* Mapping of compound assignment operators to base operators */
const COMPOUND_OPERATOR_MAP = new Map<ts.SyntaxKind, CombinedAssignmentInfo>([
    // Combined value assignments (precedence 11)
    // These are converted from a += b to a := a + b in SCL
    [ts.SyntaxKind.PlusEqualsToken, { operator: '+', precedence: OperatorPrecedence.Additive }],
    [ts.SyntaxKind.MinusEqualsToken, { operator: '-', precedence: OperatorPrecedence.Additive }],
    [ts.SyntaxKind.AsteriskEqualsToken, { operator: '*', precedence: OperatorPrecedence.Multiplicative }],
    [ts.SyntaxKind.SlashEqualsToken, { operator: '/', precedence: OperatorPrecedence.Multiplicative }],

]);

/* Data type configurations for assignment validation */
const DATA_TYPE_CONFIG = new Map<string, DataTypeConfig>([
    ['STRUCT', {
        type: 'STRUCT',
        allowedAssignments: [AssignmentType.Simple, AssignmentType.Multiple],
        requiresTypeCheck: true,
        validateAssignment: (left, right) =>
            NodeUtils.getIdentifierText(left) === NodeUtils.getIdentifierText(right),
    }],
    ['ARRAY', {
        type: 'ARRAY',
        allowedAssignments: [AssignmentType.Simple, AssignmentType.Multiple],
        requiresTypeCheck: true,
        validateAssignment: (left, right) => {
            const leftArr = NodeUtils.findParentOfType(left, ts.isArrayTypeNode);
            const rightArr = NodeUtils.findParentOfType(right, ts.isArrayTypeNode);
            if (leftArr && rightArr) {
                const leftBase = NodeUtils.getArrayBaseType(leftArr);
                const rightBase = NodeUtils.getArrayBaseType(rightArr);
                return NodeUtils.extractTypeName(leftBase) === NodeUtils.extractTypeName(rightBase);
            }
            return false;
        },
    }],
    ['STRING', {
        type: 'STRING',
        allowedAssignments: [AssignmentType.Simple, AssignmentType.Multiple],
        requiresTypeCheck: true,
        validateAssignment: (left, right) =>
            ts.isStringLiteral(right) ||
            (ts.isElementAccessExpression(left) && ts.isElementAccessExpression(right)),
    }],
    ['WSTRING', {
        type: 'WSTRING',
        allowedAssignments: [AssignmentType.Simple, AssignmentType.Multiple],
        requiresTypeCheck: true,
    }],
    ['ANY', {
        type: 'ANY',
        allowedAssignments: [AssignmentType.Simple],
        requiresTypeCheck: true,
        validateAssignment: (left, right) => {
            const lParent = NodeUtils.findParentOfType(left, ts.isParameter);
            const rParent = NodeUtils.findParentOfType(right, ts.isParameter);
            return !!lParent && !!rParent;
        },
    }],
    ['REF_TO', {
        type: 'REF_TO',
        allowedAssignments: [AssignmentType.Simple],
        requiresTypeCheck: true,
        validateAssignment: (left, right) => {
            const lType = NodeUtils.findParentOfType(left, ts.isTypeNode);
            const rType = NodeUtils.findParentOfType(right, ts.isTypeNode);
            return lType && rType && NodeUtils.extractTypeName(lType) === NodeUtils.extractTypeName(rType);
        },
    }],
]);

/* Mapping TS operators to SCL operators */
const OPERATOR_MAP = new Map<ts.SyntaxKind, OperatorInfo>([
    // Assignment operators
    [ts.SyntaxKind.EqualsToken, { sclOperator: ':=', precedence: OperatorPrecedence.Assignment, isRightAssociative: true }],
    // Note: TypeScript doesn't have a built-in ?= operator, would need custom handling

    // Logical operators
    [ts.SyntaxKind.AmpersandToken, { sclOperator: 'AND', precedence: OperatorPrecedence.LogicalAnd }],
    [ts.SyntaxKind.AmpersandAmpersandToken, { sclOperator: 'AND', precedence: OperatorPrecedence.LogicalAnd }],
    [ts.SyntaxKind.BarToken, { sclOperator: 'OR', precedence: OperatorPrecedence.LogicalOr }],
    [ts.SyntaxKind.BarBarToken, { sclOperator: 'OR', precedence: OperatorPrecedence.LogicalOr }],
    [ts.SyntaxKind.CaretToken, { sclOperator: 'XOR', precedence: OperatorPrecedence.LogicalXor }],

    // Unary operators
    [ts.SyntaxKind.ExclamationToken, { sclOperator: 'NOT', precedence: OperatorPrecedence.PowerAndNot }],
    // Note: PlusToken and MinusToken can be both unary and binary operators
    // They are handled specially in the handlePrefixUnaryExpression method

    // Power and dereference
    [ts.SyntaxKind.AsteriskAsteriskToken, { sclOperator: '**', precedence: OperatorPrecedence.PowerAndNot, isRightAssociative: true }],
    // Note: TypeScript doesn't have a built-in ^ dereference operator, would need custom handling

    // Arithmetic operators
    [ts.SyntaxKind.SlashToken, { sclOperator: '/', precedence: OperatorPrecedence.Multiplicative }],
    [ts.SyntaxKind.AsteriskToken, { sclOperator: '*', precedence: OperatorPrecedence.Multiplicative }],
    [ts.SyntaxKind.PercentToken, { sclOperator: 'MOD', precedence: OperatorPrecedence.Multiplicative }],
    [ts.SyntaxKind.PlusToken, { sclOperator: '+', precedence: OperatorPrecedence.Additive }],
    [ts.SyntaxKind.MinusToken, { sclOperator: '-', precedence: OperatorPrecedence.Additive }],

    // Relational operators
    [ts.SyntaxKind.LessThanToken, { sclOperator: '<', precedence: OperatorPrecedence.Relational }],
    [ts.SyntaxKind.GreaterThanToken, { sclOperator: '>', precedence: OperatorPrecedence.Relational }],
    [ts.SyntaxKind.LessThanEqualsToken, { sclOperator: '<=', precedence: OperatorPrecedence.Relational }],
    [ts.SyntaxKind.GreaterThanEqualsToken, { sclOperator: '>=', precedence: OperatorPrecedence.Relational }],

    // Equality operators
    [ts.SyntaxKind.EqualsEqualsToken, { sclOperator: '=', precedence: OperatorPrecedence.Equality }],
    [ts.SyntaxKind.EqualsEqualsEqualsToken, { sclOperator: '=', precedence: OperatorPrecedence.Equality }],
    [ts.SyntaxKind.ExclamationEqualsToken, { sclOperator: '<>', precedence: OperatorPrecedence.Equality }],
    [ts.SyntaxKind.ExclamationEqualsEqualsToken, { sclOperator: '<>', precedence: OperatorPrecedence.Equality }],

]);

/*==============================================================================
  SCL EXPRESSION GENERATOR
==============================================================================*/

/**
 * Generates SCL expressions from TypeScript AST nodes. Supports assignments,
 * arithmetic/logical operations, function calls, type conversions, and more.
 */
export class SCLExpressionGenerator extends BaseGenerator {
    private readonly expressionHandlers: ExpressionHandler[];

    constructor(private sourceFile: ts.SourceFile, private checker: ts.TypeChecker) {
        super();
        this.expressionHandlers = this.initializeHandlers();
    }

    /*---------------------------------------------------------------------------
      PUBLIC API
    ---------------------------------------------------------------------------*/

    generateExpression(node: ts.Expression | undefined): string {
        if (!node) return '';
        const handler = this.expressionHandlers.find((h) => h.kind === node.kind);
        if (!handler) {
            throw new Error(`Unsupported expression type: ${ts.SyntaxKind[node.kind]}`);
        }
        return handler.handler(node);
    }

    /*---------------------------------------------------------------------------
      HANDLER REGISTRATION
    ---------------------------------------------------------------------------*/

    private initializeHandlers(): ExpressionHandler[] {
        return [
            { kind: ts.SyntaxKind.Identifier, handler: this.handleIdentifier.bind(this) },
            { kind: ts.SyntaxKind.NumericLiteral, handler: this.handleLiteral.bind(this) },
            { kind: ts.SyntaxKind.StringLiteral, handler: this.handleLiteral.bind(this) },
            { kind: ts.SyntaxKind.TrueKeyword, handler: this.handleLiteral.bind(this) },
            { kind: ts.SyntaxKind.FalseKeyword, handler: this.handleLiteral.bind(this) },
            { kind: ts.SyntaxKind.PrefixUnaryExpression, handler: this.handlePrefixUnaryExpression.bind(this) },
            { kind: ts.SyntaxKind.BinaryExpression, handler: this.handleBinaryExpression.bind(this) },
            { kind: ts.SyntaxKind.PropertyAccessExpression, handler: this.handlePropertyAccess.bind(this) },
            { kind: ts.SyntaxKind.CallExpression, handler: this.handleCallExpression.bind(this) },
            { kind: ts.SyntaxKind.ElementAccessExpression, handler: this.handleElementAccess.bind(this) },
            { kind: ts.SyntaxKind.ParenthesizedExpression, handler: this.handleParenthesizedExpression.bind(this) },
            { kind: ts.SyntaxKind.ObjectLiteralExpression, handler: this.handleObjectLiteral.bind(this) },
            { kind: ts.SyntaxKind.ArrayLiteralExpression, handler: this.handleLiteral.bind(this) },
            { kind: ts.SyntaxKind.AsExpression, handler: this.handleAsExpression.bind(this) },
        ];
    }

    /*---------------------------------------------------------------------------
      OPERATOR & PARENTHESES HELPERS
    ---------------------------------------------------------------------------*/

    private getOperatorInfo(operatorKind: ts.SyntaxKind): OperatorInfo {
        const info = OPERATOR_MAP.get(operatorKind);
        if (!info) throw new Error(`Unsupported operator: ${ts.SyntaxKind[operatorKind]}`);
        return info;
    }

    private needsParentheses(expr: ts.Expression, parentOp: OperatorInfo, isRightSide = false): boolean {
        if (ts.isParenthesizedExpression(expr)) return false;

        // Do not add parentheses for the right side of a top-level assignment.
        if (expr.parent && ts.isBinaryExpression(expr.parent) &&
            expr.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
            expr.parent.right === expr) {
            return false;
        }

        if (ts.isPrefixUnaryExpression(expr)) {
            const unaryInfo = this.getOperatorInfo(expr.operator);
            return unaryInfo.precedence > parentOp.precedence;
        }

        if (ts.isBinaryExpression(expr)) {
            const childOp = this.getOperatorInfo(expr.operatorToken.kind);
            // Special handling for logical operators.
            if ([OperatorPrecedence.LogicalAnd, OperatorPrecedence.LogicalOr].includes(childOp.precedence)) {
                if ([OperatorPrecedence.LogicalAnd, OperatorPrecedence.LogicalOr].includes(parentOp.precedence)) {
                    return childOp.precedence > parentOp.precedence;
                }
                return false;
            }
            if (parentOp.precedence === OperatorPrecedence.Assignment) return true;
            if (childOp.precedence === parentOp.precedence && isRightSide && parentOp.isRightAssociative) {
                return true;
            }
            return childOp.precedence > parentOp.precedence;
        }
        return false;
    }

    private generateWrappedExpression(expr: ts.Expression, opInfo: OperatorInfo, isRight: boolean): string {
        const expStr = this.generateExpression(expr);
        return this.needsParentheses(expr, opInfo, isRight) ? `(${expStr})` : expStr;
    }

    /*---------------------------------------------------------------------------
      LITERAL, IDENTIFIER & PROPERTY HANDLERS
    ---------------------------------------------------------------------------*/

    private handleLiteral(node: ts.Expression): string {
        const parent = node.parent;
        const isForDeclaration = NodeUtils.findParentOfType(node, ts.isForStatement);

        if (ts.isBinaryExpression(parent)) {
            const sclType = this.getSCLType(parent.left);
            const value = this.extractLiteralValue(node, sclType);
            return value ?? '';
        }

        if (ts.isVariableDeclaration(parent)) {
            const varName = parent.name.getText();
            const sclType = this.getSCLType(parent);
            const value = this.extractLiteralValue(node, sclType);
            const defaultValue = TypeExtractor.getDefaultValue(sclType);
            const isForDeclaration = NodeUtils.findParentOfType(node, ts.isForStatement);
            if (value === defaultValue && !isForDeclaration) {
                return ''
            }
            return value ? `#${varName} := ${value}` : '';
        }

        if (ts.isPropertyAssignment(parent)) {
            // const varDeclaration = NodeUtils.findParentOfType(node, ts.isVariableDeclaration);
            // const varName = varDeclaration?.name.getText()
            // const propertyName = parent.name.getText();
            // const sclType = this.getSCLType(parent.initializer);
            // const value = this.extractLiteralValue(node, sclType);
            // const defaultValue = TypeExtractor.getDefaultValue(sclType);
            // console.log(value, defaultValue, sclType, parentType)
            // if (value === defaultValue) {
            //     return ''
            // }
            // return value ? `#${varName}.${propertyName} := ${value}` : '';
            throw new Error('Property assignment not supported');
        }

        if (ts.isArrayLiteralExpression(node)) {
            const elements = node.elements.map(e => this.generateExpression(e));
            return `[${elements.join(', ')}]`;
        }

        if (ts.isAsExpression(node)) {
            return this.handleAsExpression(node);
        }

        return "";
    }


    private handleAsExpression(node: ts.Expression): string {
        return "";
    }



    private getSCLType(node: ts.Node): SCLTypeEnum | undefined {
        const type = this.checker.getTypeAtLocation(node);
        const typeStr = this.checker.typeToString(type);
        return SCLTypeEnum[typeStr as keyof typeof SCLTypeEnum];
    }

    private extractLiteralValue = (expr: ts.Expression, sclType?: SCLTypeEnum): string | undefined => {
        const value = TypeExtractor.extractValue(expr, sclType);
        return value;
    }

    private handleObjectLiteral(node: ts.Expression): string {
        const parts: string[] = [];
        if (!ts.isObjectLiteralExpression(node)) return '';
        node.properties.forEach((property) => {
            if (ts.isPropertyAssignment(property)) {
                const expr = this.generateExpression(property.initializer);
                parts.push(`${expr}`);
            }
        });
        return parts.join(';\n');
    }

    private handleIdentifier(node: ts.Expression): string {
        const text = NodeUtils.getIdentifierText(node);
        return text ? `#${text}` : '';
    }

    private handlePropertyAccess(node: ts.Expression): string {
        if (!ts.isPropertyAccessExpression(node)) return '';
        const propertyPath = PropertyUtils.extractPropertyPath(node);
        const segments = propertyPath.split('.');
        return segments[0] === 'this'
            ? `#${segments[segments.length - 1]}`
            : `#${segments.join('.')}`;
    }


    private handleElementAccess(node: ts.Expression): string {
        if (!ts.isElementAccessExpression(node)) return '';
        const result = PropertyUtils.processArrayAccess(node, (expr) =>
            TypeExtractor.extractValue(expr as ts.Expression) ?? this.generateExpression(expr as ts.Expression)
        );
        return result ? `#${result.path}[${result.index}]` : '';
    }

    private handleParenthesizedExpression(node: ts.Expression): string {
        if (!ts.isParenthesizedExpression(node)) return '';
        const inner = this.generateExpression(node.expression);
        return inner ? `(${inner})` : '';
    }


    /*---------------------------------------------------------------------------
      BINARY & ASSIGNMENT HANDLERS
    ---------------------------------------------------------------------------*/

    private handleBinaryExpression(node: ts.Node): string {
        if (!ts.isBinaryExpression(node)) return '';
        return this.isAssignment(node)
            ? this.handleAssignment(node)
            : this.formatBinaryExpression(node);
    }

    private formatBinaryExpression(node: ts.BinaryExpression): string {
        const opInfo = this.getOperatorInfo(node.operatorToken.kind);
        const left = this.generateWrappedExpression(node.left, opInfo, false);
        const right = this.generateWrappedExpression(node.right, opInfo, true);
        return `${left} ${opInfo.sclOperator} ${right}`;
    }



    private isAssignment(node: ts.BinaryExpression): boolean {
        return node.operatorToken.kind === ts.SyntaxKind.EqualsToken ||
            COMPOUND_OPERATOR_MAP.has(node.operatorToken.kind);
    }

    private handleAssignment(node: ts.BinaryExpression): string {
        return COMPOUND_OPERATOR_MAP.has(node.operatorToken.kind)
            ? this.handleCombinedAssignment(node)
            : this.isMultipleAssignment(node)
                ? this.handleMultipleAssignment(node)
                : this.handleSimpleAssignment(node);
    }

    private isMultipleAssignment(node: ts.BinaryExpression): boolean {
        return ts.isBinaryExpression(node.right) &&
            (node.right.operatorToken.kind === ts.SyntaxKind.EqualsToken ||
                COMPOUND_OPERATOR_MAP.has(node.right.operatorToken.kind));
    }

    private handleSimpleAssignment(node: ts.BinaryExpression): string {
        this.validateAssignment(node.left, node.right);
        const left = this.generateExpression(node.left);

        if (ts.isLiteralExpression(node.right)) {
            const leftType = this.checker.getTypeAtLocation(node.left).aliasSymbol?.escapedName as string;
            const literalVal = TypeExtractor.extractValue(node.right, leftType);
            if (literalVal) {
                return `${left} := ${literalVal}`;
            }
        }
        const right = this.generateExpression(node.right);
        return left && right ? `${left} := ${right}` : '';
    }

    /**
     * Handles combined value assignments (+=, -=, *=, /=) by converting them to the form a := a + b.
     * In SCL, combined assignments have a precedence of 11 (same as regular assignments).
     */
    private handleCombinedAssignment(node: ts.BinaryExpression): string {
        this.validateAssignment(node.left, node.right);
        const info = COMPOUND_OPERATOR_MAP.get(node.operatorToken.kind)!;
        const left = this.generateExpression(node.left);

        // Handle literal values
        if (ts.isLiteralExpression(node.right)) {
            const leftType = this.checker.getTypeAtLocation(node.left).aliasSymbol?.escapedName as string;
            const literalVal = TypeExtractor.extractValue(node.right, leftType);
            if (literalVal) {
                // For combined assignments, we need to convert a += b to a := a + b
                return `${left} := ${left} ${info.operator} ${literalVal}`;
            }
        }

        // Handle non-literal values
        const right = this.generateExpression(node.right);
        return left && right ? `${left} := ${left} ${info.operator} ${right}` : '';
    }

    private handleMultipleAssignment(node: ts.BinaryExpression): string {
        const assignments: AssignmentOperation[] = [];
        let current: ts.BinaryExpression = node;
        while (ts.isBinaryExpression(current)) {
            const leftExpr = this.generateExpression(current.left);
            if (!leftExpr) break;
            const op = COMPOUND_OPERATOR_MAP.has(current.operatorToken.kind)
                ? COMPOUND_OPERATOR_MAP.get(current.operatorToken.kind)!.operator
                : ':=';
            assignments.unshift({
                left: leftExpr,
                right: '', // to be updated
                operator: op,
                type: COMPOUND_OPERATOR_MAP.has(current.operatorToken.kind)
                    ? AssignmentType.Combined
                    : AssignmentType.Simple,
                leftNode: current.left,
                rightNode: current.right,
            });
            if (!ts.isBinaryExpression(current.right)) {
                const rightExpr = this.generateExpression(current.right);
                if (rightExpr) assignments[0].right = rightExpr;
                break;
            }
            current = current.right;
        }
        return this.generateAssignmentChain(assignments);
    }

    private generateAssignmentChain(assignments: AssignmentOperation[]): string {
        const statements: string[] = [];
        let lastResult = assignments[0].right;
        for (const a of assignments) {
            this.validateAssignment(a.leftNode, a.rightNode);
            if (a.type === AssignmentType.Combined) {
                statements.push(`${a.left} := ${a.left} ${a.operator} ${lastResult}`);
            } else {
                statements.push(`${a.left} := ${lastResult}`);
            }
            lastResult = a.left;
        }
        return statements.join(';\n');
    }

    private validateAssignment(left: ts.Expression, right: ts.Expression): void {
        const leftTypeNode = NodeUtils.findParentOfType(left, ts.isTypeNode);
        const rightTypeNode = NodeUtils.findParentOfType(right, ts.isTypeNode);

        // If we can't determine types, we can't validate
        if (!leftTypeNode || !rightTypeNode) return;

        const leftType = NodeUtils.extractTypeName(leftTypeNode);
        const rightType = NodeUtils.extractTypeName(rightTypeNode);

        // Skip validation if types couldn't be extracted
        if (!leftType || !rightType) return;

        // Get the type configuration for validation
        const config = DATA_TYPE_CONFIG.get(leftType);
        if (!config) return; // No configuration for this type

        // Check if type validation is required and a validation function exists
        if (config.requiresTypeCheck) {
            if (config.validateAssignment) {
                // Validate using the type-specific validation function
                const validationResult = config.validateAssignment(left, right);
                if (validationResult === false) { // Only check for explicit false, not undefined
                    const leftExpr = this.generateExpression(left);
                    const rightExpr = this.generateExpression(right);
                    throw new Error(
                        `Invalid assignment: Cannot assign ${rightType} (${rightExpr}) to ${leftType} (${leftExpr}). ` +
                        `Type mismatch or unsupported operation.`
                    );
                }
            } else if (leftType !== rightType) {
                // If no specific validation is provided, default to type equality
                throw new Error(
                    `Invalid assignment: Cannot assign ${rightType} to ${leftType}. ` +
                    `Types must match exactly.`
                );
            }
        }
    }

    /*---------------------------------------------------------------------------
      PREFIX, CALL & FUNCTION ARGUMENT HANDLERS
    ---------------------------------------------------------------------------*/

    private handlePrefixUnaryExpression(node: ts.Expression): string {
        if (!ts.isPrefixUnaryExpression(node)) return '';
        const operand = this.generateExpression(node.operand);
        if (!operand) return '';

        // Handle unary plus and minus with precedence 2
        if ([ts.SyntaxKind.PlusToken, ts.SyntaxKind.MinusToken].includes(node.operator)) {
            const opChar = node.operator === ts.SyntaxKind.PlusToken ? '+' : '-';
            const opInfo = { sclOperator: opChar, precedence: OperatorPrecedence.UnaryOperators };
            return `${opChar}${this.needsParentheses(node.operand, opInfo) ? `(${operand})` : operand}`;
        }

        // Handle NOT with precedence 3
        if (node.operator === ts.SyntaxKind.ExclamationToken) {
            const opInfo = { sclOperator: 'NOT', precedence: OperatorPrecedence.PowerAndNot };
            return `${opInfo.sclOperator} ${this.needsParentheses(node.operand, opInfo) ? `(${operand})` : operand}`;
        }

        // Handle other unary operators
        const opInfo = this.getOperatorInfo(node.operator);
        return `${opInfo.sclOperator} ${this.needsParentheses(node.operand, opInfo) ? `(${operand})` : operand}`;
    }

    private handleCallExpression(node: ts.Expression): string {
        if (!ts.isCallExpression(node)) return '';
        if (ts.isPropertyAccessExpression(node.expression)) {
            return this.handlePropertyCall(node);
        }
        const { className } = this.extractCallInfo(node);
        return className ? this.generateFunctionCall(node, className) : '';
    }

    private handlePropertyCall(node: ts.CallExpression): string {
        const propAccess = node.expression as ts.PropertyAccessExpression;
        const instance = propAccess.expression;
        const methodName = propAccess.name.text;

        // Static method call if instance is an identifier.
        if (ts.isIdentifier(instance)) {
            const classDecl = NodeUtils.findClassDeclaration(this.sourceFile, instance.text);
            const staticMethod = classDecl && NodeUtils.findMethodInClass(classDecl, methodName, [ts.SyntaxKind.StaticKeyword]);
            const fcMetaData = MainCompiler.getInstance().getBlockMetadata(instance.text, 'FC');
            const isSclInstruction = fcMetaData?.blockOptions.sclInstruction
            if (!staticMethod) {
                throw new Error(`Could not find method ${methodName} in class ${instance.text}`);
            }
            if (isSclInstruction) {
                return `${instance.text}(${this.generateFunctionArgs(node, staticMethod).join(',\n')})`;
            }
            return `"${instance.text}"(${this.generateFunctionArgs(node, staticMethod).join(',\n')})`;
        }

        // Instance call: find instance type from a class member.
        let instanceType: string | undefined;
        if (ts.isPropertyAccessExpression(instance) && instance.expression.kind === ts.SyntaxKind.ThisKeyword) {
            const classDecl = this.sourceFile.statements.find(
                (stmt) => ts.isClassDeclaration(stmt) &&
                    stmt.members.some((m) => ts.isPropertyDeclaration(m) &&
                        ts.isIdentifier(m.name) && m.name.text === instance.name.text)
            ) as ts.ClassDeclaration;
            if (classDecl) {
                const member = classDecl.members.find(
                    (m) => ts.isPropertyDeclaration(m) &&
                        ts.isIdentifier(m.name) && m.name.text === instance.name.text
                ) as ts.PropertyDeclaration;
                instanceType = member?.type ? NodeUtils.extractTypeName(member.type) : undefined;
            }
        }
        if (!instanceType) {
            throw new Error(`Could not determine type for instance ${this.generateExpression(instance)}`);
        }

        const classDecl = NodeUtils.findClassDeclaration(this.sourceFile, instanceType);
        //get meta data from class declaration
        if (!classDecl) throw new Error(`Could not find class declaration for type ${instanceType}`);
        const methodDecl = NodeUtils.findMethodInClass(classDecl, methodName);


        if (!methodDecl) throw new Error(`Could not find method ${methodName} in class ${instanceType}`);
        const args = this.generateFunctionArgs(node, methodDecl);
        // Remove '#' prefix from instance name if not scl instruction
        const fbMetaData = MainCompiler.getInstance().getBlockMetadata(instanceType ?? '', 'FB');
        const isSclInstruction = fbMetaData?.blockOptions.sclInstruction ? '#' : '';

        const instanceName = this.generateExpression(instance).replace('#', '');
        return `${isSclInstruction}"${instanceName}"(${args.join(',\n')})`;
    }

    private extractCallInfo(node: ts.CallExpression): { className: string } {
        const functionName = NodeUtils.getIdentifierText(node.expression);
        if (functionName) return { className: functionName };
        if (ts.isPropertyAccessExpression(node.expression)) {
            const base = node.expression.expression;
            return ts.isIdentifier(base) ? { className: base.text } : { className: '' };
        }
        return { className: '' };
    }

    private generateFunctionCall(node: ts.CallExpression, className: string): string {
        const classDecl = NodeUtils.findClassDeclaration(this.sourceFile, className);
        if (!classDecl) return '';
        const execMethod = NodeUtils.findMethodInClass(classDecl, 'exec', [ts.SyntaxKind.StaticKeyword]);
        if (!execMethod) return '';
        const args = this.generateFunctionArgs(node, execMethod);
        return args.length ? `"${className}"(\n${args.join(',\n')}\n)` : '';
    }

    private generateFunctionArgs(node: ts.CallExpression, method: ts.MethodDeclaration): string[] {
        return node.arguments.map((arg, i) => {
            const param = method.parameters[i];
            let argVal: string | undefined;
            const op = PropertyUtils.isOutputParameter(param) ? '=>' : ':=';
            if (!param || !ts.isIdentifier(param.name)) {
                throw new Error(`Could not determine type for parameter ${param.name}`);
            }

            if (ts.isLiteralExpression(arg)) {
                const paramType = param?.type ? NodeUtils.extractTypeName(param.type) : undefined;
                if (!paramType) throw new Error(`Could not determine type for parameter ${param.name}`);
                argVal = TypeExtractor.extractValue(arg, paramType);
            } else {
                argVal = this.generateExpression(arg);
            }
            if (!argVal) return '';
            return `${param.name.text} ${op} ${argVal}`;
        }).filter(Boolean);
    }
}