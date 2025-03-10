/**
 * Metadata Utilities
 * Provides functions for handling SCL metadata
 */

import 'reflect-metadata';
import { SCLBlockMetadata, METADATA_KEYS, MetadataKey } from '../core/types/metadata-types.js';
import { SCLBlockOptions, SCLPropertyOptions, SCLCategory } from '../core/types/types.js';

/**
 * Gets metadata for a given key from a target
 */
export function getMetadata<T>(key: MetadataKey, target: any, propertyKey?: string): T {
    const metadata = propertyKey ?
        Reflect.getMetadata(key, target, propertyKey) :
        Reflect.getMetadata(key, target);
    return metadata === undefined ? {} as T : metadata;
}

/**
 * Sets metadata on a target object
 */
export function setMetadata(key: MetadataKey, value: any, target: any, propertyKey?: string): void {
    if (propertyKey) {
        Reflect.defineMetadata(key, value, target, propertyKey);
    } else {
        Reflect.defineMetadata(key, value, target);
    }
}

/**
 * Gets all SCL metadata from a target
 */
export function getSCLMetadata(target: any): SCLBlockMetadata {
    const blockOptions = getMetadata<SCLBlockOptions>(METADATA_KEYS.SCL, target);
    const properties = getMetadata<Record<string, SCLPropertyOptions>>(METADATA_KEYS.PROPERTY, target);

    return {
        blockOptions,
        properties
    };
}


/**
 * Gets property metadata for a specific property
 */
export function getPropertyMetadata(target: any, propertyKey: string): SCLPropertyOptions {
    return getMetadata<SCLPropertyOptions>(METADATA_KEYS.PROPERTY, target, propertyKey);
}

/**
 * Sets property metadata for a specific property
 */
export function setPropertyMetadata(target: any, propertyKey: string, metadata: Partial<SCLPropertyOptions>): SCLPropertyOptions {
    const existingMetadata = getPropertyMetadata(target, propertyKey);
    const mergedMetadata = { ...existingMetadata, ...metadata };
    setMetadata(METADATA_KEYS.PROPERTY, mergedMetadata, target, propertyKey);
    return mergedMetadata;
} 