// ts2scl.ts
import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

/* ------------------------------------------------------------------
   1) INTERFACES FOR OUR INTERMEDIATE REPRESENTATION (IR)
------------------------------------------------------------------ */
interface SclTypeDefinition {
  name: string;
  fields: { name: string; type: string }[];
}

interface SclFunctionBlock {
  name: string;
  staticVars: { name: string; type: string }[];
  instanceVars: { name: string; type: string }[];
  initializationCode: string; // code from constructor
  methods: {
    name: string;
    parameters: { name: string; type: string }[];
    body: string; // SCL code
  }[];
}

interface SclProgram {
  userTypes: SclTypeDefinition[];
  functionBlocks: SclFunctionBlock[];
}

/* ------------------------------------------------------------------
   2) GLOBAL SCL PROGRAM OBJECT
------------------------------------------------------------------ */
const sclProgram: SclProgram = {
  userTypes: [],
  functionBlocks: []
};

/* ------------------------------------------------------------------
   3) PARSE TS FILE
------------------------------------------------------------------ */
function parseTsFile(filePath: string): ts.SourceFile {
  const source = fs.readFileSync(filePath, "utf-8");
  return ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
}

/* ------------------------------------------------------------------
   4) VISIT NODES
------------------------------------------------------------------ */
function visitNode(node: ts.Node) {
  if (ts.isTypeAliasDeclaration(node)) {
    handleTypeAliasDeclaration(node);
  } else if (ts.isClassDeclaration(node)) {
    handleClassDeclaration(node);
  }
  ts.forEachChild(node, visitNode);
}

/* ------------------------------------------------------------------
   5) HANDLE TYPE ALIASES => SCL TYPE ... STRUCT
------------------------------------------------------------------ */
function handleTypeAliasDeclaration(typeAlias: ts.TypeAliasDeclaration) {
  const name = typeAlias.name.text;
  if (ts.isTypeLiteralNode(typeAlias.type)) {
    const fields: { name: string; type: string }[] = [];
    for (const member of typeAlias.type.members) {
      if (ts.isPropertySignature(member) && member.name) {
        const fieldName = (member.name as ts.Identifier).text;
        // For simplicity, we won't do deep type analysis. We just store 'ANY'
        // Or you could map `member.type.getText()` => SCL
        fields.push({ name: fieldName, type: "ANY" });
      }
    }
    sclProgram.userTypes.push({ name, fields });
  }
}

/* ------------------------------------------------------------------
   6) HANDLE CLASS => FUNCTION_BLOCK
------------------------------------------------------------------ */
function handleClassDeclaration(cls: ts.ClassDeclaration) {
  if (!cls.name) return;
  const fbName = cls.name.text; // e.g. "name"

  const staticVars: { name: string; type: string }[] = [];
  const instanceVars: { name: string; type: string }[] = [];
  let initializationCode = "";
  const methods: Array<{
    name: string;
    parameters: { name: string; type: string }[];
    body: string;
  }> = [];

  // Explore class members
  for (const member of cls.members) {
    // 6.1) Static field => goes to staticVars
    if (ts.isPropertyDeclaration(member) && member.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword)) {
      const propName = member.name.getText();
      // For simplicity, we map everything to "ANY". Adjust to real SCL type if needed.
      staticVars.push({ name: propName, type: "ANY" });
      continue;
    }

    // 6.2) Instance field => goes to instanceVars
    if (
      ts.isPropertyDeclaration(member) &&
      !member.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword)
    ) {
      const propName = member.name.getText();
      instanceVars.push({ name: propName, type: "ANY" });
      continue;
    }

    // 6.3) Constructor => code => initializationCode
    if (ts.isConstructorDeclaration(member)) {
      // We'll just grab the text from the constructor body as a comment or naive translation
      if (member.body) {
        initializationCode = translateStatements(member.body.statements);
      }
      continue;
    }

    // 6.4) Arrow function property => becomes a METHOD
    //   e.g. private a = (param: functionParam) => { ... }
    //   We'll detect "member.initializer" is a FunctionExpression or ArrowFunction
    if (
      ts.isPropertyDeclaration(member) &&
      member.initializer &&
      (ts.isArrowFunction(member.initializer) || ts.isFunctionExpression(member.initializer))
    ) {
      const methodName = member.name.getText(); // e.g. "a"
      const funcNode = member.initializer;      // ArrowFunction or FunctionExpression
      const methodParams: { name: string; type: string }[] = [];
      let body = "";

      if (ts.isArrowFunction(funcNode) || ts.isFunctionExpression(funcNode)) {
        // Get the param type => for demonstration, naive approach
        if (funcNode.parameters.length > 0) {
          const p = funcNode.parameters[0];
          const paramName = p.name.getText(); // e.g. "param"
          // We won't do deep analysis of param's type, just store "functionParam"
          let paramType = "ANY";
          if (p.type) {
            paramType = p.type.getText(); // e.g. "functionParam"
          }
          methodParams.push({ name: paramName, type: paramType });
        }
        if (funcNode.body) {
          if (ts.isBlock(funcNode.body)) {
            // block body { ... }
            body = translateStatements(funcNode.body.statements);
          } else {
            // Expression body => e.g. () => expr
            body = `// expression body: ${funcNode.body.getText()}`;
          }
        }
      }

      methods.push({
        name: methodName,
        parameters: methodParams,
        body
      });
    }
  }

  // Add the function block to the IR
  sclProgram.functionBlocks.push({
    name: fbName,
    staticVars,
    instanceVars,
    initializationCode,
    methods
  });
}

/* ------------------------------------------------------------------
   7) TRANSLATE STATEMENTS (Naive)
------------------------------------------------------------------ */
function translateStatements(statements: ts.NodeArray<ts.Statement>): string {
  const lines: string[] = [];
  for (const stmt of statements) {
    // We'll just store each statement's text as a comment for demonstration
    lines.push(`// ${stmt.getText()}`);
  }
  return lines.join("\n");
}

/* ------------------------------------------------------------------
   8) SCL GENERATION
------------------------------------------------------------------ */
function generateSclType(t: SclTypeDefinition): string {
  // TYPE functionParam :
  //   STRUCT
  //       input : ANY;
  //       output: ANY;
  //   END_STRUCT
  // END_TYPE
  const fields = t.fields.map(f => `    ${f.name} : ${f.type};`).join("\n");
  return `
TYPE ${t.name} :
    STRUCT
${fields}
    END_STRUCT
END_TYPE
`.trim();
}

function generateSclFunctionBlock(fb: SclFunctionBlock): string {
  // FUNCTION_BLOCK "name"
  // VAR
  //   b : ANY;
  // END_VAR
  //
  // VAR_STAT?
  //   a : ANY;
  // END_VAR
  //
  // INITIALIZATION
  //   // constructor code
  // END_INITIALIZATION
  //
  // METHOD "a"
  // VAR_INPUT
  //   param : functionParam;
  // END_VAR
  // BEGIN
  //   // arrow function statements
  // END_METHOD
  //
  // END_FUNCTION_BLOCK

  const instanceVarDecl = fb.instanceVars
    .map(v => `    ${v.name} : ${v.type};`)
    .join("\n");

  // If you want to handle static vs. instance differently, some SCL dialects use e.g. "VAR_GLOBAL" or "VAR_STAT".
  // For demonstration, let's pretend there's a "VAR_STATIC" block.
  const staticVarDecl = fb.staticVars
    .map(v => `    ${v.name} : ${v.type};`)
    .join("\n");

  // Initialization
  let initStr = "";
  if (fb.initializationCode.trim()) {
    initStr = `
INITIALIZATION
${indent(fb.initializationCode)}
END_INITIALIZATION
`;
  }

  let methodStr = "";
  fb.methods.forEach(m => {
    const params = m.parameters.length
      ? `
VAR_INPUT
${m.parameters.map(p => `    ${p.name} : ${p.type};`).join("\n")}
END_VAR
`
      : "";
    methodStr += `
METHOD "${m.name}"
${params}BEGIN
${indent(m.body)}
END_METHOD

`;
  });

  return `
FUNCTION_BLOCK "${fb.name}"
VAR
${instanceVarDecl}
END_VAR

VAR_STATIC
${staticVarDecl}
END_VAR

${initStr}${methodStr}
END_FUNCTION_BLOCK
`.trim();
}

function indent(str: string, space = "    "): string {
  return str
    .split("\n")
    .map(line => (line.trim() ? space + line : line))
    .join("\n");
}

/* ------------------------------------------------------------------
   9) MAIN: BUILD SCL
------------------------------------------------------------------ */
function buildScl(): string {
  let sclOut = "";
  sclProgram.userTypes.forEach(t => {
    sclOut += generateSclType(t) + "\n\n";
  });
  sclProgram.functionBlocks.forEach(fb => {
    sclOut += generateSclFunctionBlock(fb) + "\n\n";
  });
  return sclOut;
}

/* ------------------------------------------------------------------
   10) CLI
------------------------------------------------------------------ */
function main(inFile: string, outFile: string) {
  const src = parseTsFile(inFile);
  visitNode(src);

  const sclCode = buildScl();
  fs.writeFileSync(outFile, sclCode, "utf-8");
  console.log(`Wrote SCL to ${outFile}`);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: ts-node ts2scl.ts <input.ts> <output.scl>");
    process.exit(1);
  }
  main(path.resolve(args[0]), path.resolve(args[1]));
}
