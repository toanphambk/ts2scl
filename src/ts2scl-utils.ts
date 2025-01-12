import * as ts from 'typescript';
import * as fs from 'fs';

export interface TypeDefinition {
  name: string;
  fields: { name: string; type: string }[];
}

export interface FunctionBlock {
  name: string;
  staticVars: { name: string; type: string }[];
  instanceVars: { name: string; type: string }[];
  initializationCode: string;
  methods: {
    name: string;
    parameters: { name: string; type: string }[];
    body: string;
  }[];
}

export function generateSclType(typeDefinition: TypeDefinition): string {
  let scl = `TYPE ${typeDefinition.name} :\n`;
  scl += `STRUCT\n`;
  
  for (const field of typeDefinition.fields) {
    scl += `  ${field.name} : ${field.type};\n`;
  }
  
  scl += `END_STRUCT;\n`;
  scl += `END_TYPE\n`;
  
  return scl;
}

export function generateSclFunctionBlock(fb: FunctionBlock): string {
  let scl = `FUNCTION_BLOCK "${fb.name}"\n`;
  
  // Static variables
  if (fb.staticVars.length > 0) {
    scl += `VAR_STATIC\n`;
    for (const v of fb.staticVars) {
      scl += `  ${v.name} : ${v.type};\n`;
    }
    scl += `END_VAR\n`;
  }
  
  // Instance variables
  if (fb.instanceVars.length > 0) {
    scl += `VAR\n`;
    for (const v of fb.instanceVars) {
      scl += `  ${v.name} : ${v.type};\n`;
    }
    scl += `END_VAR\n`;
  }
  
  // Initialization code
  if (fb.initializationCode) {
    scl += `\n${fb.initializationCode}\n`;
  }
  
  // Methods
  for (const method of fb.methods) {
    scl += `\nMETHOD ${method.name}\n`;
    if (method.parameters.length > 0) {
      scl += `VAR_INPUT\n`;
      for (const param of method.parameters) {
        scl += `  ${param.name} : ${param.type};\n`;
      }
      scl += `END_VAR\n`;
    }
    scl += `\n${method.body}\n`;
    scl += `END_METHOD\n`;
  }
  
  scl += `END_FUNCTION_BLOCK\n`;
  return scl;
}

export function parseTsFile(filePath: string): ts.SourceFile {
  const content = fs.readFileSync(filePath, 'utf8');
  return ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );
} 