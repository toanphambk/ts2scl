import * as ts from 'typescript';
import { SCLPropertyOptions, SCLInstanceType } from '../core/types/types';
import { ArrayDimension } from '../core/types/types';

type HasDecorators = ts.ClassDeclaration | ts.PropertyDeclaration | ts.MethodDeclaration | ts.ParameterDeclaration;

/**
 * Utility class for handling TypeScript decorators.
 * Centralizes all decorator-related operations.
 */
export class DecoratorUtils {
    /**
     * Extracts metadata from a decorator with a specific name
     */
    static extractDecoratorMetadata<T>(
        node: HasDecorators,
        decoratorName: string,
        extractor: (args: ts.NodeArray<ts.Expression>) => T
    ): T | undefined {
        const decorators = ts.getDecorators(node);
        if (!decorators) return undefined;

        for (const decorator of decorators) {
            if (!ts.isCallExpression(decorator.expression)) continue;
            if (!ts.isIdentifier(decorator.expression.expression)) continue;
            if (decorator.expression.expression.text !== decoratorName) continue;

            return extractor(decorator.expression.arguments);
        }

        return undefined;
    }

    /**
     * Checks if a node has a specific decorator
     */
    static hasDecorator(node: HasDecorators, decoratorName: string): boolean {
        const decorators = ts.getDecorators(node);
        return decorators?.some(dec => {
            if (!ts.isCallExpression(dec.expression)) return false;
            const expr = dec.expression.expression;
            return ts.isIdentifier(expr) && expr.text === decoratorName;
        }) ?? false;
    }

    static extractInstanceType(property: ts.PropertyDeclaration): SCLInstanceType {
        return this.extractDecoratorMetadata(
            property,
            'Instance',
            (args) => {
                if (args.length !== 1) return undefined;
                if (!ts.isStringLiteral(args[0])) return undefined;
                return args[0].text as SCLInstanceType;
            }
        ) ?? '' as SCLInstanceType;
    }

    /**
     * Extracts array dimensions from SCLArray decorator
     */
    static extractArrayDimensions(property: ts.PropertyDeclaration): Partial<SCLPropertyOptions> {
        return this.extractDecoratorMetadata(
            property,
            'SCLArray',
            (args) => {
                if (args.length !== 1) return {};
                const dimensionsArg = args[0];
                if (!ts.isArrayLiteralExpression(dimensionsArg)) return {};

                const dimensions = dimensionsArg.elements
                    .map((element) => this.parseDimension(element))
                    .filter((dim): dim is NonNullable<typeof dim> => dim !== undefined);

                return { dimensions };
            }
        ) ?? {};
    }



    /**
     * Extracts scope metadata from scope decorators (Input, Output, InOut, Temp)
     */
    static extractScopeMetadata(node: ts.PropertyDeclaration | ts.ParameterDeclaration): Partial<SCLPropertyOptions> {
        const scopeMap = {
            Input: { scope: 'IN' },
            Output: { scope: 'OUT' },
            InOut: { scope: 'INOUT' },
            Temp: { scope: 'TEMP' },
            Static: { scope: 'STATIC' }
        } as const;

        for (const decoratorName of Object.keys(scopeMap)) {
            if (this.hasDecorator(node, decoratorName)) {
                return {
                    scope: scopeMap[decoratorName as keyof typeof scopeMap].scope,
                };
            }
        }

        return {};
    }

    /**
     * Extracts retain metadata from Retain decorator
     */
    static extractRetainMetadata(property: ts.PropertyDeclaration): Partial<SCLPropertyOptions> {
        return this.hasDecorator(property, 'Retain') ? { retain: true } : {};
    }


    /**
     * Parses array dimension information from a dimension expression
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
     */
    private static extractNumberFromNode(node: ts.Expression): number | undefined {
        if (ts.isNumericLiteral(node)) {
            return parseInt(node.text, 10);
        }
        return undefined;
    }
} 