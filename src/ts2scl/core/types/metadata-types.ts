/**
 * Metadata Types Module
 * Defines the structure and types for SCL metadata handling
 */

import { SCLBlockOptions, SCLCategory, SCLPropertyOptions } from "./types";
/**
 * Metadata for SCL blocks including both block-level and property-level configuration
 */
export interface SCLBlockMetadata {
    blockOptions: SCLBlockOptions;
    /** Property configurations keyed by property name */
    properties: Record<string, SCLPropertyOptions>;
}

/**
 * Keys used for storing metadata
 */
export const METADATA_KEYS = {
    SCL: Symbol('scl:metadata'),
    PROPERTY: Symbol('scl:property'),
} as const;

/**
 * Utility type for metadata key values
 */
export type MetadataKey = typeof METADATA_KEYS[keyof typeof METADATA_KEYS]; 