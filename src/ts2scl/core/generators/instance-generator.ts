/**
 * Instance DB Generator
 * Utility class for generating instance DBs for function blocks and functions
 * 
 * This generator is responsible for:
 * 1. Extracting instance DB metadata from class declarations
 * 2. Generating SCL code for instance DBs
 */

import ts from 'typescript';
import { Logger, LogLevel } from '../../utils/logger.js';
import { DecoratorUtils } from '../../utils/decorator-utils.js';
import { PropertyUtils } from '../../utils/property-utils.js';
import { MainCompiler } from '../compilers/main-compiler.js';
import { SCLBlockMetadata } from '../types/metadata-types.js';
import { SCLCategory, SCLInstanceType } from '../types/types';
// Interface for metadata lookup function to avoid circular dependency
export interface MetadataLookup {
    findBlockMetadataByName(name: string): SCLBlockMetadata | undefined;
}

/**
 * Utility class for generating instance DBs
 * Centralizes the instance DB generation logic used by both FC and FB compilers
 */
export class InstanceDBGenerator {
    private static instance: InstanceDBGenerator;
    private readonly logger: Logger;
    private metadataLookup?: MetadataLookup;

    private constructor() {
        this.logger = Logger.getInstance();
        this.logger.setLogLevel(LogLevel.DEBUG);
    }

    /**
     * Gets the singleton instance of InstanceDBGenerator
     * @returns The singleton instance
     */
    public static getInstance(): InstanceDBGenerator {
        if (!InstanceDBGenerator.instance) {
            InstanceDBGenerator.instance = new InstanceDBGenerator();
        }
        return InstanceDBGenerator.instance;
    }

    /**
     * Sets the metadata lookup function to avoid circular dependency
     * @param lookup The metadata lookup implementation
     */
    public setMetadataLookup(lookup: MetadataLookup): void {
        this.metadataLookup = lookup;
    }

    /**
     * Gets instance DB metadata from a class declaration
     * @param classDeclaration The class declaration to extract metadata from
     * @returns Array of instance DB metadata
     */
    public getInstanceDBMetadata(classDeclaration: ts.ClassDeclaration, blockType: SCLCategory): { name: string, instanceType: SCLInstanceType, instanceSclType: string, sclInstruction?: string }[] {
        try {
            this.logger.debug('Getting instance DB metadata', { blockType });
            const className = classDeclaration.name?.getText(classDeclaration.getSourceFile());
            if (!className) {
                this.logger.error('Class name not found');
                return [];
            }
            const classMetadata = MainCompiler.getInstance().getBlockMetadata(className, blockType);
            const instances = classDeclaration.members
                .filter(member => ts.isPropertyDeclaration(member) && DecoratorUtils.hasDecorator(member, 'Instance'))
                .map(prop => {
                    const propDecl = prop as ts.PropertyDeclaration;
                    const instanceName = PropertyUtils.extractPropertyName(propDecl);
                    const instanceSclType = PropertyUtils.extractType(propDecl);
                    const removedQuotesType = instanceSclType.replace(/"/g, '');
                    const instanceMetadata = MainCompiler.getInstance().getBlockMetadata(removedQuotesType, blockType);
                    const instanceType = classMetadata?.properties[instanceName]?.instanceType
                    const sclInstruction = instanceMetadata?.blockOptions?.sclInstruction
                    if (!instanceType) {
                        throw new Error(`Instance type not defined for property ${instanceName}`);
                    }

                    if (sclInstruction) {
                        return {
                            name: instanceName,
                            instanceType,
                            instanceSclType: removedQuotesType,
                            sclInstruction: sclInstruction

                        };
                    }
                    return {
                        name: instanceName,
                        instanceType,
                        instanceSclType: removedQuotesType,
                    };
                });
            console.log(instances);
            return instances;
        } catch (error) {
            this.logger.error('Failed to get instance DB metadata', {
                error: error instanceof Error ? error : new Error(String(error))
            });
            return [];
        }
    }

    /**
     * Generates SCL code for an instance DB
     * @param instanceName The name of the instance
     * @param instanceType The type of the instance
     * @returns Generated SCL code as string
     */
    public generateInstanceDB(instanceName: string, instanceType: SCLInstanceType, instanceSclType: string, sclInstruction?: string): string {
        try {
            this.logger.debug(' ', { instanceName, instanceType });

            if (instanceType !== 'single') {
                throw new Error(`Instance type ${instanceType} not supported`);
            }
            const _instanceSclType = sclInstruction ? instanceSclType : `"${instanceSclType}"`;
            const sections = [
                `DATA_BLOCK "${instanceName}"`,
                'VERSION : 0.1',
                'NON_RETAIN',
                `${_instanceSclType}`,
                'BEGIN',
                'END_DATA_BLOCK'
            ];

            return sections.join('\n');
        } catch (error) {
            this.logger.error('Failed to generate instance DB code', {
                error: error instanceof Error ? error : new Error(String(error)),
                instanceName,
                instanceType
            });
            throw error;
        }
    }
} 