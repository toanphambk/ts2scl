import 'reflect-metadata';
import { ArrayDimension, SCLBlockOptions, SCLPropertyOptions, SCLInstanceType, SCLCategory, SCLVarType } from './types.js';
import { METADATA_KEYS, MetadataKey } from './metadata-types.js';
import { setMetadata, setPropertyMetadata } from '../../utils/metadata-utils.js';


export function SCLType(options: Omit<SCLBlockOptions, 'category' | 'name'> = {}) {
  return function (target: any) {
    const metadata: SCLBlockOptions = {
      ...options,
      category: 'UDT',
      name: target.name,
    };
    setMetadata(METADATA_KEYS.SCL, metadata, target);
    return target;
  };
}

export function SCLDb(options: Omit<SCLBlockOptions, 'category' | 'name'>) {
  return function (target: any) {
    const metadata: SCLBlockOptions = {
      ...options,
      category: 'DB',
      name: target.name,
    };
    setMetadata(METADATA_KEYS.SCL, metadata, target);
    return target;
  };
}

export function SCLFc(options: Omit<SCLBlockOptions, 'category' | 'name'> = {}) {
  return function (target: any) {
    const metadata: SCLBlockOptions = {
      ...options,
      category: 'FC',
      name: target.name,
    };
    setMetadata(METADATA_KEYS.SCL, metadata, target);
    return target;
  };
}

export function SCLFb(options: Omit<SCLBlockOptions, 'category' | 'name'> = {}) {
  return function (target: any) {
    const metadata: SCLBlockOptions = {
      ...options,
      category: 'FB',
      name: target.name,
    };
    setMetadata(METADATA_KEYS.SCL, metadata, target);
    return target;
  };
}


export function SCLArray(dimensions?: ArrayDimension[]) {
  return function (target: any, propertyKey: string) {
    const metadata: Partial<SCLPropertyOptions> = {
      dimensions: dimensions,
    };
    setPropertyMetadata(target, propertyKey, metadata);
  };
}


export function Instance(instanceType: SCLInstanceType) {
  return function (target: any, propertyKey: string | symbol) {
    if (instanceType === 'single') {
      const metadata: Partial<SCLPropertyOptions> = {
        instanceType: instanceType,
      };
      setPropertyMetadata(target, propertyKey as string, metadata);
    }
    if (instanceType === 'multiple') {
      const metadata: Partial<SCLPropertyOptions> = {
        instanceType: instanceType,
        scope: 'STATIC' as SCLVarType
      };
      setPropertyMetadata(target, propertyKey as string, metadata);
    }
  };
}

export function Retain() {
  return function (target: any, propertyKey: string | symbol, parameterIndex?: number) {
    const metadata: Partial<SCLPropertyOptions> = { retain: true };
    if (typeof parameterIndex === 'number') {
      // Parameter decorator
      setPropertyMetadata(target, `param${parameterIndex}`, metadata);
    } else {
      // Property decorator
      setPropertyMetadata(target, propertyKey as string, metadata);
    }
  };
}

export function Visibility(options: { externalVisible?: true, externalWritable?: true, externalAccessible?: true, s7SetPoint?: true }) {
  return function (target: any, propertyKey: string | symbol, parameterIndex?: number) {
    const metadata: Partial<SCLPropertyOptions> = { ...options };
    setPropertyMetadata(target, propertyKey as string, metadata);
  };
}

export function Temp() {
  return function (target: any, propertyKey: string) {
    const metadata: Partial<SCLPropertyOptions> = {
      scope: 'TEMP' as SCLVarType,
    };

    setPropertyMetadata(target, propertyKey, metadata);
  };
}

export function Static() {
  return function (target: any, propertyKey: string) {
    const metadata: Partial<SCLPropertyOptions> = {
      scope: 'STATIC' as SCLVarType,
    };

    setPropertyMetadata(target, propertyKey, metadata);
  };
}

export function Input({ externalVisible = true, externalWritable = true, externalAccessible = true }) {
  return function (target: any, propertyKey: string, parameterIndex: number) {
    const metadata: Partial<SCLPropertyOptions> = {
      scope: 'IN',
      externalVisible,
      externalWritable,
      externalAccessible,
    };
    setPropertyMetadata(target, `param${parameterIndex}`, metadata);
  };
}

export function Output({ externalVisible = true, externalWritable = true, externalAccessible = true }) {
  return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
    const metadata: Partial<SCLPropertyOptions> = {
      scope: 'OUT',
      externalVisible,
      externalWritable,
      externalAccessible,
    };


    setPropertyMetadata(target, `param${parameterIndex}`, metadata);
  };
}

