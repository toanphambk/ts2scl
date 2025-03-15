/**
 * Metadata Utilities
 * Provides functions for handling SCL metadata
 */

import 'reflect-metadata';
import { SCLBlockMetadata, METADATA_KEYS, MetadataKey } from '../core/types/metadata-types.js';
import { SCLBlockOptions, SCLPropertyOptions } from '../core/types/types.js';




/**
 * Gets metadata for a given key from a target
 */
export function getMetadata<T>(key: MetadataKey, target: any, propertyKey?: string): T {
    const metadata = propertyKey ?
        Reflect.getMetadata(key, target, propertyKey) :
        Reflect.getMetadata(key, target);
    return metadata === undefined ? {} as T : metadata;
}

export const setMetadata = (key: MetadataKey, value: any, target: any, propertyKey?: string): void => {

    if (propertyKey) {
        Reflect.defineMetadata(key, value, target, propertyKey);
    } else {
        Reflect.defineMetadata(key, value, target);
    }
};


/**
 * Gets all SCL metadata from a target
 */
export function getSCLMetadata(target: any): SCLBlockMetadata {
    const blockOptions = getMetadata<SCLBlockOptions>(METADATA_KEYS.SCL, target);

    // Get properties metadata from the prototype
    let properties: Record<string, SCLPropertyOptions> = {};

    // Get properties directly from the target
    const directProperties = getMetadata<Record<string, SCLPropertyOptions>>(METADATA_KEYS.PROPERTY, target);

    // Get properties from the prototype (for instance properties)
    const prototypeProperties = target.prototype ?
        getMetadata<Record<string, SCLPropertyOptions>>(METADATA_KEYS.PROPERTY, target.prototype) :
        {};

    // Merge all properties
    properties = { ...directProperties, ...prototypeProperties };

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
 * @param target The target object or class
 * @param propertyKey The property name
 * @param metadata The metadata to set
 * @returns The merged metadata
 */
export function setPropertyMetadata(target: any, propertyKey: string, metadata: Partial<SCLPropertyOptions>): SCLPropertyOptions {
    const existingMetadata = getPropertyMetadata(target, propertyKey);
    const mergedMetadata = { ...existingMetadata, ...metadata };

    // Store metadata on the target
    setMetadata(METADATA_KEYS.PROPERTY, mergedMetadata, target, propertyKey);

    // Also store in a collective property map on the target
    const allProperties = getMetadata<Record<string, SCLPropertyOptions>>(METADATA_KEYS.PROPERTY, target);
    allProperties[propertyKey] = mergedMetadata;
    setMetadata(METADATA_KEYS.PROPERTY, allProperties, target);

    // If target is an instance (has constructor), also store on the constructor's prototype
    if (target.constructor && target.constructor !== Object && target.constructor !== Function) {
        const protoAllProperties = getMetadata<Record<string, SCLPropertyOptions>>(METADATA_KEYS.PROPERTY, target.constructor.prototype);
        protoAllProperties[propertyKey] = mergedMetadata;
        setMetadata(METADATA_KEYS.PROPERTY, protoAllProperties, target.constructor.prototype);
    }

    const updatedMetadata = getPropertyMetadata(target, propertyKey);


    return updatedMetadata;
} 