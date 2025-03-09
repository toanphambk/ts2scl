import * as ts from 'typescript';
import { BaseFunctionGenerator } from './component/base-function-generator.js';
import { TypeExtractor } from '../../utils/type-extractor.js';
import { DecoratorUtils } from '../../utils/decorator-utils.js';
import { SCLVarType, SCLBlockOptions, SCLPropertyOptions, SCLCategory } from '../types/types.js';
import { PropertyUtils } from '../../utils/property-utils.js';

export class FunctionGenerator extends BaseFunctionGenerator {
    generateFunctionContent(classDecl: ts.ClassDeclaration): string {
        if (!this.validateInput(classDecl)) return '';

        const metadata = this.extractFunctionMetadata(classDecl);
        if (!metadata) return '';

        const execMethod = this.findExecMethod(classDecl, metadata.name);
        if (!execMethod) return '';

        this.initializeStatementGenerator(metadata.name);

        const sections = [
            this.generateFunctionHeader(metadata),
            this.generateVarSectionForMethod(execMethod, 'Input', 'VAR_INPUT', 'IN'),
            this.generateVarSectionForMethod(execMethod, 'Output', 'VAR_OUTPUT', 'OUT'),
            this.generateTempVarsFromExecMethod(execMethod),
            this.generateFunctionBody(execMethod)
        ];

        return sections.filter(Boolean).join('\n');
    }

    private generateFunctionHeader(metadata: SCLBlockOptions): string {
        return `FUNCTION "${metadata.name}" : ${metadata.returnType}`;
    }

    private generateFunctionBody(method: ts.MethodDeclaration): string {
        const bodyContent = this.generateComponentBody(method);

        return ['BEGIN', bodyContent, 'END_FUNCTION'].join('\n');
    }

    private extractFunctionMetadata(classDecl: ts.ClassDeclaration): SCLBlockOptions | null {
        const name = classDecl.name!.text;

        // First find the exec method to get its return type
        const execMethod = this.findExecMethod(classDecl, name);
        if (!execMethod || !execMethod.type) {
            this.logger.error(`No static exec method with return type found in class ${name}`);
            return null;
        }

        // Extract return type from exec method
        let returnType = 'VOID';
        if (ts.isTypeReferenceNode(execMethod.type)) {
            const extractedType = TypeExtractor.extractBrandedType(execMethod.type);
            if (extractedType) {
                returnType = extractedType;
            }
        }

        // Verify the class has the SCLFn decorator
        const metadata = DecoratorUtils.extractDecoratorMetadata(
            classDecl,
            'SCLFn',
            () => ({
                name,
                category: 'FC' as SCLCategory,
                returnType
            })
        );

        if (!metadata) {
            this.logger.error(`No valid SCLFn decorator found for class ${name}`);
            return null;
        }
        return metadata;
    }
}
