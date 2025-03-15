/**
 * Section Generator
 * Handles generation of SCL code sections (VAR, VAR_INPUT, VAR_OUTPUT, VAR_IN_OUT, etc.)
 * 
 * This class is responsible for generating different variable sections in SCL code:
 * - Input parameters (VAR_INPUT)
 * - Output parameters (VAR_OUTPUT) 
 * - InOut parameters (VAR_IN_OUT)
 * - Temporary variables (VAR_TEMP)
 * 
 * Example usage:
 * ```ts
 * // Create generator instance
 * const generator = new SCLSectionGenerator();
 * 
 * // Generate variable sections for a function
 * const sections = generator.generateVariableSections(DriveControl, implementation);
 * Result:
 * VAR_INPUT
 *   enable : BOOL;
 *   setSpeed : INT;
 * END_VAR
 * VAR_OUTPUT
 *   status : WORD;
 * END_VAR
 * VAR_IN_OUT
 *   reference : INT;
 * END_VAR
 * VAR_TEMP
 *   tempDriveStatus : WORD;
 *   tempResult : INT;
 * END_VAR
 * ```
 */

import * as ts from 'typescript';
import { BaseGenerator } from '../../base/base-generator.js';
import { SCLPropertyOptions, SCLTypeEnum, SCLVarType } from '../../types/types.js';
import { getSCLMetadata } from '../../../utils/metadata-utils.js';
import { DecoratorUtils } from '../../../utils/decorator-utils.js';
import { PropertyUtils } from '../../../utils/property-utils.js';

/**
 * Extended property options for section generation
 */
interface ExtendedSCLPropertyOptions extends Omit<SCLPropertyOptions, 'name'> {
    name: string;
    paramIndex?: number;
    type?: string;
    scope: SCLVarType;
}

export class SCLSectionGenerator extends BaseGenerator {

    /**
     * Generates all variable sections for a function or block
     * @param type The class type containing the function/block
     * @param implementation The TypeScript method declaration (for functions)
     * @returns Generated SCL sections as string
     */
    generateVariableSections(type: any, implementation?: ts.MethodDeclaration): string {
        const sections: string[] = [];
        const variables = this.loadAllVariables(type, implementation);

        // Group variables by scope
        const groupedVars = this.groupVariablesByScope(variables);

        // Generate sections for each scope
        if (groupedVars.IN.length > 0) {
            sections.push(this.generateSclContent('VAR_INPUT', groupedVars.IN));
        }
        if (groupedVars.OUT.length > 0) {
            sections.push(this.generateSclContent('VAR_OUTPUT', groupedVars.OUT));
        }
        if (groupedVars.INOUT.length > 0) {
            sections.push(this.generateSclContent('VAR_IN_OUT', groupedVars.INOUT));
        }
        if (groupedVars.TEMP.length > 0) {
            sections.push(this.generateSclContent('VAR_TEMP', groupedVars.TEMP));
        }
        if (groupedVars.STATIC.length > 0) {
            sections.push(this.generateSclContent('VAR', groupedVars.STATIC));
        }

        return sections.filter(Boolean).join('\n');
    }

    /**
     * Generates a variable section from method parameters
     */
    generateMethodVarSection(
        method: ts.MethodDeclaration,
        decoratorName: string,
        header: string,
        scope: SCLVarType
    ): string {
        if (!method.parameters) return '';

        const params = method.parameters
            .filter(param => DecoratorUtils.hasDecorator(param, decoratorName))
            .map(param => this.parseMethodParameter(param, scope))
            .filter(Boolean) as SCLPropertyOptions[];

        if (params.length === 0) return '';

        const { retainedProps, nonRetainedProps } = this.splitProperties(params);
        const sections: string[] = [];

        // Always generate RETAIN section first if it exists
        if (retainedProps.length > 0) {
            sections.push(this.generateSclContent(`${header} RETAIN`, retainedProps));
        }

        // Then generate non-RETAIN section
        if (nonRetainedProps.length > 0) {
            sections.push(this.generateSclContent(header, nonRetainedProps));
        }

        return sections.join('\n');
    }

    /**
     * Generates a variable section from class members
     */
    generateMemberVarSection(
        members: readonly ts.ClassElement[],
        decoratorName: string,
        header: string,
        scope: SCLVarType
    ): string {
        const vars = members
            .filter(member => ts.isPropertyDeclaration(member))
            .map(prop => this.parsePropertyDeclaration(prop as ts.PropertyDeclaration, scope))
            .filter(Boolean) as SCLPropertyOptions[];

        if (vars.length === 0) return '';

        const { retainedProps, nonRetainedProps } = this.splitProperties(vars);
        const sections: string[] = [];

        // Generate RETAIN section first if it exists
        if (retainedProps.length > 0) {
            sections.push(this.generateSclContent(`${header} RETAIN`, retainedProps));
        }

        // Then generate non-RETAIN section
        if (nonRetainedProps.length > 0) {
            sections.push(this.generateSclContent(header, nonRetainedProps));
        }

        return sections.join('\n');
    }

    /**
     * Generates a generic variable section
     * @param sectionType The type of section (VAR, VAR_INPUT, etc.)
     * @param variables Array of variable definitions
     * @returns Generated SCL section
     */
    generateSclContent(sectionType: string, variables: Partial<SCLPropertyOptions>[]): string {
        if (variables.length === 0) return '';

        return [
            sectionType,
            variables
                .map((variable) => this.generateVariableDeclaration(variable))
                .join('\n'),
            `END_VAR`
        ].join('\n');
    }

    /**
     * Loads all variables from a type and implementation
     */
    private loadAllVariables(type: any, implementation?: ts.MethodDeclaration): ExtendedSCLPropertyOptions[] {
        const variables: ExtendedSCLPropertyOptions[] = [];

        if (implementation) {
            // Load parameters from implementation
            variables.push(...this.processParameters(implementation.parameters, type));
        }

        // Load static variables
        variables.push(...this.loadStaticVariables(type));

        // Load temp variables
        variables.push(...this.loadTempVariables(type));

        return variables;
    }

    /**
     * Groups variables by their scope (IN, OUT, IN_OUT, TEMP)
     */
    private groupVariablesByScope(variables: ExtendedSCLPropertyOptions[]): Record<SCLVarType, ExtendedSCLPropertyOptions[]> {
        return variables.reduce((acc, variable) => {
            acc[variable.scope].push(variable);
            return acc;
        }, {
            IN: [] as ExtendedSCLPropertyOptions[],
            OUT: [] as ExtendedSCLPropertyOptions[],
            INOUT: [] as ExtendedSCLPropertyOptions[],
            TEMP: [] as ExtendedSCLPropertyOptions[],
            STATIC: [] as ExtendedSCLPropertyOptions[]
        });
    }

    /**
     * Processes parameters from method declaration
     */
    private processParameters(
        parameters: ts.NodeArray<ts.ParameterDeclaration>,
        type: any
    ): ExtendedSCLPropertyOptions[] {
        const metadata = getSCLMetadata(type);
        return parameters
            .map((param, index) => {
                if (!ts.isIdentifier(param.name)) return null;

                const paramMetadata = metadata?.properties?.[`param${index}`];
                const scope = this.determineParameterScope(param);
                if (!scope) return null;

                // Extract visibility attributes from decorators
                const visibilityMetadata = DecoratorUtils.extractScopeMetadata(param);

                return {
                    ...paramMetadata,
                    name: param.name.text,
                    paramIndex: index,
                    type: param.name.text.toLowerCase().includes('status') ? 'WORD' : paramMetadata?.sclType,
                    scope,
                    externalVisible: visibilityMetadata.externalVisible,
                    externalWritable: visibilityMetadata.externalWritable,
                    externalAccessible: visibilityMetadata.externalAccessible
                } as ExtendedSCLPropertyOptions;
            })
            .filter((param): param is ExtendedSCLPropertyOptions => param !== null);
    }

    /**
     * Determines parameter scope based on decorators
     */
    private determineParameterScope(param: ts.ParameterDeclaration): SCLVarType | null {
        if (DecoratorUtils.hasDecorator(param, 'Input')) return 'IN';
        if (DecoratorUtils.hasDecorator(param, 'Output')) return 'OUT';
        if (DecoratorUtils.hasDecorator(param, 'InOut')) return 'INOUT';
        return null;
    }

    /**
     * Loads static variables from a type
     */
    private loadStaticVariables(type: any): ExtendedSCLPropertyOptions[] {
        const metadata = getSCLMetadata(type);
        const staticVars: ExtendedSCLPropertyOptions[] = [];

        // Process class properties with @Static decorator
        Object.entries(metadata?.properties || {}).forEach(([key, prop]) => {
            if (prop.scope === 'STATIC') {
                staticVars.push({
                    name: key,
                    sclType: prop.sclType,
                    scope: 'STATIC'
                });
            }
        });

        return staticVars;
    }

    /**
     * Loads temporary variables from a type
     */
    private loadTempVariables(type: any): ExtendedSCLPropertyOptions[] {
        const metadata = getSCLMetadata(type);
        const tempVars: ExtendedSCLPropertyOptions[] = [];

        // Process class properties with @Temp decorator
        Object.entries(metadata?.properties || {}).forEach(([key, prop]) => {
            if (prop.scope === 'TEMP') {
                tempVars.push({
                    name: key,
                    sclType: prop.sclType,
                    scope: 'TEMP'
                });
            }
        });

        return tempVars;
    }

    /**
     * Parses a method parameter into SCLPropertyOptions
     */
    private parseMethodParameter(param: ts.ParameterDeclaration, scope: SCLVarType): SCLPropertyOptions | null {
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
        const isRetain = DecoratorUtils.hasDecorator(param, 'Retain');

        return {
            name,
            sclType,
            scope,
            retain: isRetain,
            externalVisible: visibilityMetadata.externalVisible,
            externalWritable: visibilityMetadata.externalWritable,
            externalAccessible: visibilityMetadata.externalAccessible
        };
    }

    /**
     * Parses a property declaration into SCLPropertyOptions
     */
    private parsePropertyDeclaration(prop: ts.PropertyDeclaration, scope: SCLVarType): SCLPropertyOptions | null {
        return PropertyUtils.parsePropertyParameter(prop);
    }

    /**
     * Splits properties into retained and non-retained groups
     */
    private splitProperties(properties: SCLPropertyOptions[]) {
        return properties.reduce(
            (acc, property) => {
                if (property.retain) {
                    acc.retainedProps.push(property);
                } else {
                    acc.nonRetainedProps.push(property);
                }
                return acc;
            },
            {
                retainedProps: [] as SCLPropertyOptions[],
                nonRetainedProps: [] as SCLPropertyOptions[],
            }
        );
    }


    private generateVariableDeclaration(options: Partial<SCLPropertyOptions>): string {
        const visibility = this.generateVisibilityAttributes(options);
        const sclType = options.sclType || "";
        const declaration = visibility ?
            `${options.name} ${visibility} : ${sclType};` :
            `${options.name} : ${sclType};`;
        return this.indent(declaration);
    }
} 