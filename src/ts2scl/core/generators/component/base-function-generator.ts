import * as ts from 'typescript';
import { BaseGenerator } from '../../base/base-generator.js';
import { TypeExtractor } from '../../../utils/type-extractor.js';
import { NodeUtils } from '../../../utils/node-utils.js';
import { SCLStatementGenerator } from './statement-generator.js';
import { DecoratorUtils } from '../../../utils/decorator-utils.js';
import { SCLSectionGenerator } from './section-generator.js';
import { SCLVarType, SCLPropertyOptions, SCLTypeEnum } from '../../types/types.js';
import { PropertyUtils } from '../../../utils/property-utils.js';
import { MainCompiler } from '../../compilers/main-compiler.js';

export abstract class BaseFunctionGenerator extends BaseGenerator {
    protected statementGenerator?: SCLStatementGenerator;
    protected readonly sectionGenerator: SCLSectionGenerator;
    protected sourceFile?: ts.SourceFile;
    protected checker: ts.TypeChecker;
    constructor() {
        super();
        this.sectionGenerator = new SCLSectionGenerator();

    }

    setSourceFile(sourceFile: ts.SourceFile, program: ts.Program): void {
        this.sourceFile = sourceFile;
        this.checker = program.getTypeChecker();
    }

    protected validateInput(classDecl: ts.ClassDeclaration): boolean {
        if (!classDecl.name || !ts.isIdentifier(classDecl.name) || !this.sourceFile) {
            this.logger.error('Invalid class declaration or missing source file');
            return false;
        }
        return true;
    }

    protected findExecMethod(classDecl: ts.ClassDeclaration, className: string, modifiers: ts.SyntaxKind[] = []): ts.MethodDeclaration | null {
        const execMethod = NodeUtils.findMethodInClass(classDecl, 'exec', modifiers);
        if (!execMethod) {
            this.logger.error(`No exec method found in class ${className}`);
            return null;
        }
        return execMethod;
    }

    protected initializeStatementGenerator(className: string): void {
        if (!this.sourceFile) return;
        this.statementGenerator = new SCLStatementGenerator(className, this.sourceFile, this.checker);
    }

    protected generateParameterOptions(param: ts.ParameterDeclaration): SCLPropertyOptions | null {
        if (!ts.isIdentifier(param.name)) return null;

        const name = param.name.text;
        let sclType = 'VOID';

        if (param.type && ts.isTypeReferenceNode(param.type)) {
            const extractedType = PropertyUtils.extractType(param as unknown as ts.PropertyDeclaration);
            if (extractedType) {
                sclType = extractedType;
            }
        }

        // Extract visibility attributes from decorators
        const visibilityMetadata = DecoratorUtils.extractScopeMetadata(param);

        return {
            name,
            sclType,
            externalVisible: visibilityMetadata.externalVisible,
            externalWritable: visibilityMetadata.externalWritable,
            externalAccessible: visibilityMetadata.externalAccessible
        };
    }

    protected generateVarSectionForMethod(
        method: ts.MethodDeclaration,
        decoratorName: string,
        header: string,
        scope: SCLVarType
    ): string {
        return this.sectionGenerator.generateMethodVarSection(method, decoratorName, header, scope);
    }

    protected generateVarSectionForMembers(
        members: readonly ts.ClassElement[],
        decoratorName: string,
        header: string,
        scope: SCLVarType,
        optionGenerator: (elem: ts.ClassElement) => SCLPropertyOptions | null
    ): string {
        return this.sectionGenerator.generateMemberVarSection(members, decoratorName, header, scope);
    }

    /**
  * Extracts local variable declarations from the exec method body and generates a VAR_TEMP section
  */
    protected generateTempVarsFromExecMethod(method: ts.MethodDeclaration): string {
        if (!method.body || !ts.isBlock(method.body) || !this.checker) {
            return '';
        }

        const tempVars: SCLPropertyOptions[] = [];
        const loopVars = new Set<string>();

        // Helper function to extract loop variables from for statements
        const extractLoopVars = (node: ts.Node) => {
            if (ts.isForStatement(node)) {
                if (node.initializer && ts.isVariableDeclarationList(node.initializer)) {
                    for (const declaration of node.initializer.declarations) {
                        if (ts.isIdentifier(declaration.name)) {
                            loopVars.add(declaration.name.text);
                        }
                    }
                }
            }

            // Recursively check all child nodes
            ts.forEachChild(node, extractLoopVars);
        };

        // Process all statements in the method body and extract loop variables
        extractLoopVars(method.body);

        // Process all statements in the method body
        for (const statement of method.body.statements) {
            // Look for variable declarations (let/const)
            if (ts.isVariableStatement(statement)) {
                for (const declaration of statement.declarationList.declarations) {
                    if (ts.isIdentifier(declaration.name)) {
                        const name = declaration.name.text;
                        let sclType = '';

                        // Use TypeChecker to get the type
                        const type = this.checker.getTypeAtLocation(declaration);
                        if (type) {
                            // Get the symbol of the type
                            const symbol = type.symbol || (type.aliasSymbol);

                            if (symbol) {
                                const typeName = symbol.getName()
                                sclType = SCLTypeEnum[typeName as keyof typeof SCLTypeEnum] || `"${typeName}"`;
                            } else if (declaration.type) {
                                // Fallback to AST-based type extraction if symbol is not available
                                if (ts.isTypeReferenceNode(declaration.type)) {
                                    if (ts.isIdentifier(declaration.type.typeName)) {
                                        const typeName = declaration.type.typeName.text;
                                        sclType = SCLTypeEnum[typeName as keyof typeof SCLTypeEnum] || `"${typeName}"`;
                                    } else {
                                        sclType = TypeExtractor.extractBrandedType(declaration.type) || `"${declaration.type.getText()}"`;
                                    }
                                }
                            }
                        }
                        tempVars.push({ name, sclType });
                    }
                }
            }
        }

        // Add loop variables to temp vars
        for (const loopVar of loopVars) {
            // Only add if not already in tempVars
            if (!tempVars.some(v => v.name === loopVar)) {
                tempVars.push({ name: loopVar, sclType: 'INT' });
            }
        }

        return this.sectionGenerator.generateSclContent('VAR_TEMP', tempVars);
    }

    /**
     * Generates initialization statements for temp variables
     */

    protected generateComponentBody(method: ts.MethodDeclaration): string {
        if (!method.body || !this.statementGenerator) return '';
        return this.statementGenerator.generateFunctionBody(method.body, this.checker);
    }

    protected generateInstanceOptions(prop: ts.ClassElement): SCLPropertyOptions | null {
        if (!ts.isPropertyDeclaration(prop) || !ts.isIdentifier(prop.name)) return null;
        const name = prop.name.text;
        let sclType = 'VOID';
        if (prop.type && ts.isTypeReferenceNode(prop.type)) {
            const extractedType = PropertyUtils.extractType(prop);
            if (extractedType) {
                sclType = extractedType;  // The quotes will be added by the section generator
            }
        }
        return {
            name,
            sclType,
            s7SetPoint: false  // Add S7_SetPoint attribute for instances
        };
    }
} 