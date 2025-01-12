import 'reflect-metadata'

// The key for storing metadata in the Reflect metadata store
const METADATA_KEY = {
  Retain: Symbol("Retain"),
  ExternalVisible: Symbol("ExternalVisible"),
  S7SetPoint: Symbol("S7SetPoint"),
  ExternalAccessible: Symbol("ExternalAccessible"),
  ExternalWritable: Symbol("ExternalWritable"),
  
};

export function Retain(retainValue: boolean) {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata(METADATA_KEY.Retain, retainValue, target, propertyKey);
  };
}

export function ExternalVisible(visValue: boolean) {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata(METADATA_KEY.ExternalVisible, visValue, target, propertyKey);
  };
}

export function S7SetPoint(setPoint: boolean) {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata(METADATA_KEY.S7SetPoint, setPoint, target, propertyKey);
  };
}

export { METADATA_KEY };
