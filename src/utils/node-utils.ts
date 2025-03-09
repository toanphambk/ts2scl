import * as ts from 'typescript';

/**
 * Utility class for common TypeScript node operations.
 * Centralizes node traversal, type extraction, and value handling.
 */
export class NodeUtils {
    /**
     * Extracts a type name from a type node, handling various node types.
     */
    static extractTypeName(node: ts.Node): string | undefined {
        if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
            return node.typeName.text;
        }
        if (ts.isIdentifier(node)) {
            return node.text;
        }
        return undefined;
    }


    /**
     * Gets the base element type of an array type, traversing through multi-dimensional arrays.
     */
    static getArrayBaseType(arrayType: ts.ArrayTypeNode): ts.TypeNode {
        let elementType = arrayType.elementType;
        while (ts.isArrayTypeNode(elementType)) {
            elementType = elementType.elementType;
        }
        return elementType;
    }

    /**
     * Safely gets an identifier's text.
     */
    static getIdentifierText(node: ts.Node): string | undefined {
        return ts.isIdentifier(node) ? node.text : undefined;
    }

    /**
     * Traverses up the AST to find a parent node of a specific type.
     */
    static findParentOfType<T extends ts.Node>(
        node: ts.Node,
        typeGuard: (node: ts.Node) => node is T
    ): T | undefined {
        let current = node.parent;
        while (current) {
            if (typeGuard(current)) {
                return current;
            }
            current = current.parent;
        }
        return undefined;
    }

    /**
     * Visits all nodes in a source file that match a specific type guard.
     */
    static findNodesOfType<T extends ts.Node>(
        sourceFile: ts.SourceFile,
        typeGuard: (node: ts.Node) => node is T
    ): T[] {
        const results: T[] = [];
        const visit = (node: ts.Node): void => {
            if (typeGuard(node)) results.push(node);
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return results;
    }



    /**
     * Finds a specific class declaration in a source file or any imported files.
     */
    static findClassDeclaration(
        sourceFile: ts.SourceFile | undefined,
        className: string
    ): ts.ClassDeclaration | undefined {
        if (!sourceFile) return undefined;

        // Try to find the class in the current file.
        const classInCurrentFile = this.findNodesOfType(sourceFile, ts.isClassDeclaration)
            .find(node => node.name?.text === className);
        if (classInCurrentFile) return classInCurrentFile;

        // If not found, create a program to search all source files.
        const program = ts.createProgram([sourceFile.fileName], {});
        for (const file of program.getSourceFiles()) {
            if (file.fileName === sourceFile.fileName) continue; // Skip current file.
            const foundClass = this.findNodesOfType(file, ts.isClassDeclaration)
                .find(node => node.name?.text === className);
            if (foundClass) return foundClass;
        }
        return undefined;
    }

    /**
     * Finds a specific function declaration in a source file or any imported files.
     */
    static findFunctionDeclaration(
        sourceFile: ts.SourceFile | undefined,
        functionName: string
    ): ts.FunctionDeclaration | undefined {
        if (!sourceFile) return undefined;

        // Try to find the function in the current file.
        const functionInCurrentFile = this.findNodesOfType(sourceFile, ts.isFunctionDeclaration)
            .find(node => node.name?.text === functionName);
        if (functionInCurrentFile) return functionInCurrentFile;

        // If not found, create a program to search all source files.
        const program = ts.createProgram([sourceFile.fileName], {});
        for (const file of program.getSourceFiles()) {
            if (file.fileName === sourceFile.fileName) continue; // Skip current file.
            const foundFunction = this.findNodesOfType(file, ts.isFunctionDeclaration)
                .find(node => node.name?.text === functionName);
            if (foundFunction) return foundFunction;
        }
        return undefined;
    }

    /**
     * Finds a specific method in a class declaration.
     */
    static findMethodInClass(
        classDecl: ts.ClassDeclaration,
        methodName: string,
        modifiers?: ts.SyntaxKind[],
        requireStatic: boolean = false
    ): ts.MethodDeclaration | undefined {
        return classDecl.members.find(member => {
            if (!ts.isMethodDeclaration(member) || !ts.isIdentifier(member.name)) {
                return false;
            }

            const hasCorrectName = member.name.text === methodName;

            // Check if method has required modifiers
            const hasRequiredModifiers = !modifiers || modifiers.every(mod =>
                member.modifiers?.some(m => m.kind === mod)
            );

            // Check static requirement
            const isStatic = member.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword);
            const meetsStaticRequirement = !requireStatic || isStatic;

            return hasCorrectName && hasRequiredModifiers && meetsStaticRequirement;
        }) as ts.MethodDeclaration | undefined;
    }
}
