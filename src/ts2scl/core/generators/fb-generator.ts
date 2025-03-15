/**
 * Function Block Generator
 * Generates SCL function block code from TypeScript class definitions decorated with @SCLFB
 * 
 * This class is responsible for generating SCL function block definitions from TypeScript classes.
 * It handles:
 * - Function block declarations and attributes
 * - Input parameters with @Input decorator
 * - Output parameters with @Output decorator
 * - Static variables with @Static decorator
 * - Function block implementation and body generation
 * 
 * Example:
 * ```ts
 * @SCLFB()
 * class DriveController {
 *   @Static()
 *   private static statusWord: WORD = toWORD(0);
 *   
 *   public static exec(
 *     @Input() enable: BOOL,
 *     @Input() targetSpeed: INT,
 *     @Output() status: INT
 *   ): void {
 *     // Function block implementation
 *   }
 * }
 * ```
 */

import * as ts from 'typescript';
import { BaseFunctionGenerator } from './component/base-function-generator.js';
import { TypeExtractor } from '../../utils/type-extractor.js';
import { DecoratorUtils } from '../../utils/decorator-utils.js';
import { SCLVarType, SCLBlockOptions, SCLPropertyOptions, SCLCategory, SCLTypeEnum } from '../types/types.js';
import { PropertyUtils } from '../../utils/property-utils.js';

export class FunctionBlockGenerator extends BaseFunctionGenerator {
    generateFunctionBlockContent(classDecl: ts.ClassDeclaration): string {
        if (!this.validateInput(classDecl)) return '';

        const metadata = this.extractFunctionBlockMetadata(classDecl);
        if (!metadata) return '';

        const execMethod = this.findExecMethod(classDecl, metadata.name, [ts.SyntaxKind.PublicKeyword]);
        if (!execMethod) return '';

        this.initializeStatementGenerator(metadata.name);

        const sections = [
            this.generateFunctionBlockHeader(metadata),
            this.generateVarSectionForMethod(execMethod, 'Input', 'VAR_INPUT', 'IN'),
            this.generateVarSectionForMethod(execMethod, 'Output', 'VAR_OUTPUT', 'OUT'),
            this.generateVarSectionForMembers(classDecl.members, 'Static', 'VAR', 'STATIC', this.generateStaticOptions.bind(this)),
            this.generateTempVarsFromExecMethod(execMethod),
            this.generateFunctionBlockBody(execMethod)
        ];

        return sections.filter(Boolean).join('\n');
    }

    private generateFunctionBlockHeader(metadata: SCLBlockOptions): string {
        return `FUNCTION_BLOCK "${metadata.name}"`;
    }

    private generateFunctionBlockBody(method: ts.MethodDeclaration): string {
        const bodyContent = this.generateComponentBody(method);

        return ['BEGIN', bodyContent, 'END_FUNCTION_BLOCK'].join('\n');
    }

    private extractFunctionBlockMetadata(classDecl: ts.ClassDeclaration): SCLBlockOptions | null {
        const name = classDecl.name!.text;

        const metadata = DecoratorUtils.extractDecoratorMetadata(
            classDecl,
            'SCLFb',
            (args) => ({
                name,
                category: 'FB' as SCLCategory
            })
        );

        if (!metadata) {
            this.logger.error(`No valid SCLFb decorator found for class ${name}`);
            return null;
        }

        return metadata;
    }

    private generateVariableOptions(prop: ts.ClassElement): SCLPropertyOptions | null {
        if (!ts.isPropertyDeclaration(prop) || !ts.isIdentifier(prop.name)) return null;
        const name = prop.name.text;
        let sclType = 'VOID';
        if (prop.type && ts.isTypeReferenceNode(prop.type)) {
            const extractedType = TypeExtractor.extractBrandedType(prop.type);
            if (extractedType) {
                sclType = extractedType;
            }
        }
        return { name, sclType };
    }

    private generateStaticOptions(prop: ts.ClassElement): SCLPropertyOptions | null {
        if (!ts.isPropertyDeclaration(prop) || !ts.isIdentifier(prop.name)) return null;
        const name = prop.name.text;
        let sclType = 'VOID';
        if (prop.type && ts.isTypeReferenceNode(prop.type)) {
            const extractedType = PropertyUtils.extractType(prop);
            if (extractedType) {
                sclType = extractedType;
            }
        }

        // Check for Retain decorator
        const isRetain = DecoratorUtils.hasDecorator(prop, 'Retain');
        return {
            name,
            sclType,
            retain: isRetain
        };
    }
} 