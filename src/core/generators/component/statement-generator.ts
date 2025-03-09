import * as ts from 'typescript';
import { BaseGenerator } from '../../base/base-generator.js';
import { SCLExpressionGenerator } from './expression-generator.js';
import { TypeExtractor } from '../../../utils/type-extractor.js';
import { SCLTypeEnum } from '../../types/types.js';

export class SCLStatementGenerator extends BaseGenerator {
    private expressionGenerator: SCLExpressionGenerator;

    constructor(private currentFunctionName: string, private sourceFile: ts.SourceFile, private checker: ts.TypeChecker) {
        super();
        this.expressionGenerator = new SCLExpressionGenerator(sourceFile, checker);
    }

    generateFunctionBody(body: ts.Block, checker: ts.TypeChecker): string {
        const nodeHandlers = new Map<ts.SyntaxKind, (node: ts.Node) => string>([
            [ts.SyntaxKind.IfStatement, this.handleIfStatement.bind(this)],
            [ts.SyntaxKind.Block, this.handleBlock.bind(this)],
            [ts.SyntaxKind.ReturnStatement, this.handleReturnStatement.bind(this)],
            [ts.SyntaxKind.ExpressionStatement, this.handleExpressionStatement.bind(this)],
            [ts.SyntaxKind.ForStatement, this.handleForStatement.bind(this)],
            [ts.SyntaxKind.WhileStatement, this.handleWhileStatement.bind(this)],
            [ts.SyntaxKind.DoStatement, this.handleDoWhileStatement.bind(this)],
            [ts.SyntaxKind.BreakStatement, this.handleBreakStatement.bind(this)],
            [ts.SyntaxKind.VariableStatement, this.handleVariableStatement.bind(this)]
        ]);
        return Array.from(body.statements)
            .map(node => {
                const handler = nodeHandlers.get(node.kind);
                return handler ? handler(node) : this.handleUnknownStatement(node);
            })
            .join('');
    }

    private handleBlock(node: ts.Node): string {
        const block = node as ts.Block;
        return block.statements.map(stmt => this.generateStatement(stmt)).join('');
    }

    private handleIfStatement(node: ts.Node): string {
        const ifStatement = node as ts.IfStatement;
        const ifParts: string[] = [];
        let currentNode: ts.IfStatement | ts.Statement | undefined = ifStatement;
        let isFirst = true;
        while (currentNode && ts.isIfStatement(currentNode)) {
            const condition = this.expressionGenerator.generateExpression(currentNode.expression);
            const thenBranch = this.generateBranch(currentNode.thenStatement);
            if (isFirst) {
                ifParts.push(`    IF ${condition} THEN\n${thenBranch}`);
                isFirst = false;
            } else {
                ifParts.push(`    ELSIF ${condition} THEN\n${thenBranch}`);
            }
            currentNode = currentNode.elseStatement;
        }
        if (currentNode) {
            const elseBranch = this.generateBranch(currentNode);
            ifParts.push(`    ELSE\n${elseBranch}`);
        }
        ifParts.push('    END_IF;\n');
        return ifParts.join('');
    }

    private handleReturnStatement(node: ts.Node): string {
        const returnStatement = node as ts.ReturnStatement;
        if (returnStatement.expression) {
            return `    #${this.currentFunctionName} := ${this.expressionGenerator.generateExpression(returnStatement.expression)};\n`;
        }
        return ``;
    }

    private handleExpressionStatement(node: ts.Node): string {
        const expressionStatement = node as ts.ExpressionStatement;
        return `    ${this.expressionGenerator.generateExpression(expressionStatement.expression)};\n`;
    }

    private generateBranch(statement: ts.Statement): string {
        const content = this.generateStatement(statement);
        return this.indent(content, 2);
    }

    private handleForStatement(node: ts.Node): string {
        const forStatement = node as ts.ForStatement;

        // Extract initializer (typically a variable declaration)
        let initValue = '';
        if (forStatement.initializer) {
            if (ts.isVariableDeclarationList(forStatement.initializer)) {
                initValue = this.expressionGenerator.generateExpression(forStatement.initializer.declarations[0].initializer);
            }
        }

        // Extract condition (the "TO" part)
        let endValue = '';
        if (forStatement.condition && ts.isBinaryExpression(forStatement.condition)) {
            endValue = this.expressionGenerator.generateExpression(forStatement.condition.right);
        }

        // Extract incrementor (the "BY" part)
        let step = '1'; // Default step is 1
        let isDescending = false;

        if (forStatement.incrementor) {
            if (ts.isBinaryExpression(forStatement.incrementor)) {
                // Handle i += n or i -= n
                if (forStatement.incrementor.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken &&
                    ts.isNumericLiteral(forStatement.incrementor.right)) {
                    step = forStatement.incrementor.right.text;
                } else if (forStatement.incrementor.operatorToken.kind === ts.SyntaxKind.MinusEqualsToken &&
                    ts.isNumericLiteral(forStatement.incrementor.right)) {
                    step = `-${forStatement.incrementor.right.text}`;
                    isDescending = true;
                }
            } else if (ts.isPostfixUnaryExpression(forStatement.incrementor) ||
                ts.isPrefixUnaryExpression(forStatement.incrementor)) {
                // Handle i++ or ++i (step = 1) or i-- or --i (step = -1)
                if (ts.isPostfixUnaryExpression(forStatement.incrementor) &&
                    forStatement.incrementor.operator === ts.SyntaxKind.MinusMinusToken) {
                    step = '-1';
                    isDescending = true;
                } else if (ts.isPrefixUnaryExpression(forStatement.incrementor) &&
                    forStatement.incrementor.operator === ts.SyntaxKind.MinusMinusToken) {
                    step = '-1';
                    isDescending = true;
                }
            }
        }

        // Check if we need to infer a descending loop based on initializer and condition
        if (!isDescending && forStatement.initializer && forStatement.condition) {
            // Try to determine if this is a descending loop by comparing initializer and condition
            let initValue: number | undefined;
            let condValue: number | undefined;

            // Extract initializer value
            if (ts.isVariableDeclarationList(forStatement.initializer)) {
                const declaration = forStatement.initializer.declarations[0];
                if (declaration && declaration.initializer && ts.isNumericLiteral(declaration.initializer)) {
                    initValue = parseInt(declaration.initializer.text);
                }
            }

            // Extract condition value
            if (ts.isBinaryExpression(forStatement.condition) && ts.isNumericLiteral(forStatement.condition.right)) {
                condValue = parseInt(forStatement.condition.right.text);
            }

            // If initializer > condition, it's likely a descending loop
            if (initValue !== undefined && condValue !== undefined && initValue > condValue && step === '1') {
                step = '-1';
            }
        }

        // Generate the loop body
        const body = this.generateBranch(forStatement.statement);

        // Build the SCL FOR statement
        const forParts: string[] = [];

        // Construct the FOR statement, omitting "BY 1" as it's the default
        if (step === '1') {
            forParts.push(`    FOR ${initValue} TO ${endValue} DO\n${body}`);
        } else {
            forParts.push(`    FOR ${initValue} TO ${endValue} BY ${step} DO\n${body}`);
        }

        forParts.push('    END_FOR;\n');

        return forParts.join('');
    }

    private handleWhileStatement(node: ts.Node): string {
        const whileStatement = node as ts.WhileStatement;

        // Extract the condition
        const condition = this.expressionGenerator.generateExpression(whileStatement.expression);

        // Generate the loop body
        const body = this.generateBranch(whileStatement.statement);

        // Build the SCL WHILE statement
        const whileParts: string[] = [];

        whileParts.push(`    WHILE ${condition} DO\n${body}`);
        whileParts.push('    END_WHILE;\n');

        return whileParts.join('');
    }


    /**
     * Updated variable statement handler.
     * It iterates over each variable declaration and uses the dedicated variable declaration handler.
     */
    private handleVariableStatement(node: ts.Node): string {
        if (!ts.isVariableStatement(node)) {
            console.error("Node is not a ts.VariableStatement.");
            return "";
        }

        const parts: string[] = [];

        node.declarationList.declarations.map(decl => {
            const statement = this.expressionGenerator.generateExpression(decl.initializer)
            if (statement !== '') {
                parts.push(`${statement};\n`)
            }
        })
        return parts.join('');
    }

    private handleDoWhileStatement(node: ts.Node): string {
        const doWhileStatement = node as ts.DoStatement;

        // Extract the condition (inverted for UNTIL)
        const condition = this.expressionGenerator.generateExpression(doWhileStatement.expression);

        // Generate the loop body
        const body = this.generateBranch(doWhileStatement.statement);

        // Build the SCL REPEAT-UNTIL statement
        const repeatParts: string[] = [];

        repeatParts.push(`    REPEAT\n${body}`);

        // Replace JavaScript negation operator (!) with SCL's NOT if present
        const formattedCondition = condition.replace(/!/g, 'NOT ');

        repeatParts.push(`    UNTIL ${formattedCondition} END_REPEAT;\n`);

        return repeatParts.join('');
    }

    private handleBreakStatement(node: ts.Node): string {
        // In SCL, the break statement is translated to EXIT
        return "    EXIT;\n";
    }

    generateStatement(node: ts.Statement): string {
        const statementHandlers = new Map<ts.SyntaxKind, (node: ts.Statement) => string>([
            [ts.SyntaxKind.ExpressionStatement, this.handleExpressionStatement.bind(this)],
            [ts.SyntaxKind.ReturnStatement, this.handleReturnStatement.bind(this)],
            [ts.SyntaxKind.IfStatement, this.handleIfStatement.bind(this)],
            [ts.SyntaxKind.Block, this.handleBlock.bind(this)],
            [ts.SyntaxKind.ForStatement, this.handleForStatement.bind(this)],
            [ts.SyntaxKind.WhileStatement, this.handleWhileStatement.bind(this)],
            [ts.SyntaxKind.DoStatement, this.handleDoWhileStatement.bind(this)],
            [ts.SyntaxKind.BreakStatement, this.handleBreakStatement.bind(this)],
            [ts.SyntaxKind.VariableStatement, this.handleVariableStatement.bind(this)]
        ]);
        const handler = statementHandlers.get(node.kind);
        return handler ? handler(node) : this.handleUnknownStatement(node);
    }

    private handleUnknownStatement(node: ts.Node): string {
        const nodeKind = ts.SyntaxKind[node.kind];
        this.logger.warn(`Unhandled statement type: ${nodeKind}`, {
            nodeKind,
            nodePos: node.pos,
            nodeEnd: node.end
        });
        return '';
    }
}
