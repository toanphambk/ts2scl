import 'reflect-metadata';
import { ArrayDimension, SCLBlockOptions, SCLPropertyOptions, SCLInstanceType, SCLCategory, SCLVarType } from './types.js';
import { METADATA_KEYS, MetadataKey } from './metadata-types.js';
import { setPropertyMetadata } from '../../utils/metadata-utils.js';
import { type } from 'os';
const getMetadata = <T>(key: MetadataKey, target: any): T => Reflect.getMetadata(key, target) as T;

const setMetadata = (key: MetadataKey, value: any, target: any, propertyKey?: string): void => {

  if (propertyKey) {
    Reflect.defineMetadata(key, value, target, propertyKey);
  } else {
    Reflect.defineMetadata(key, value, target);
  }
};

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

export function SCLFn(options: Omit<SCLBlockOptions, 'category' | 'name'> = {}) {
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

export function SCLFB(options: Omit<SCLBlockOptions, 'category' | 'name'> = {}) {
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
    const type = Reflect.getMetadata('design:type', target, propertyKey);
    const metadata: Partial<SCLPropertyOptions> = {
      instanceType: instanceType,
      sclType: type?.name
    };
    setPropertyMetadata(target, propertyKey as string, metadata);
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
    const type = Reflect.getMetadata('design:type', target, propertyKey);
    const metadata: Partial<SCLPropertyOptions> = {
      scope: 'TEMP' as SCLVarType,
      sclType: type?.name,
    };

    setPropertyMetadata(target, propertyKey, metadata);
  };
}

export function Static() {
  return function (target: any, propertyKey: string) {
    const type = Reflect.getMetadata('design:type', target, propertyKey);
    const metadata: Partial<SCLPropertyOptions> = {
      scope: 'STATIC' as SCLVarType,
      sclType: type?.name,
    };

    setPropertyMetadata(target, propertyKey, metadata);
  };
}

export function Input({ externalVisible = true, externalWritable = true, externalAccessible = true }) {
  return function (target: any, propertyKey: string, parameterIndex: number) {
    const types = Reflect.getMetadata('design:paramtypes', target, propertyKey);
    const paramType = types[parameterIndex];
    const metadata: Partial<SCLPropertyOptions> = {
      scope: 'IN',
      sclType: paramType.name,
      externalVisible,
      externalWritable,
      externalAccessible,
    };
    setPropertyMetadata(target, `param${parameterIndex}`, metadata);
  };
}

export function Output({ externalVisible = true, externalWritable = true, externalAccessible = true }) {
  return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
    const types = Reflect.getMetadata('design:paramtypes', target, propertyKey);
    const paramType = types[parameterIndex];
    const metadata: Partial<SCLPropertyOptions> = {
      scope: 'OUT',
      sclType: paramType.name,
      externalVisible,
      externalWritable,
      externalAccessible,
    };

    setPropertyMetadata(target, `param${parameterIndex}`, metadata);
  };
}

export function getSCLMetadata(target: any) {
  const metadata = {
    block: getMetadata<SCLBlockOptions>(METADATA_KEYS.SCL, target),
    properties: getMetadata<Record<string, SCLPropertyOptions>>(METADATA_KEYS.PROPERTY, target),
  };

  return metadata;
}

export * from './types.js';
