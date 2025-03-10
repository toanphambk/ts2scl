import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { existsSync, readFileSync, mkdirSync, rmSync } from 'fs';
import { resolve } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

describe('Sample FB Structure Tests', () => {
    const sampleFbPath = resolve(process.cwd(), 'src/logic/sample-fb.ts');

    test('sample-fb.ts file should exist', () => {
        expect(existsSync(sampleFbPath)).toBe(true);
    });

    test('sample-fb.ts should contain DriveController class', () => {
        const fileContent = readFileSync(sampleFbPath, 'utf-8');
        expect(fileContent).toContain('export class DriveController');
    });

    test('sample-fb.ts should contain DriveControllerInput class', () => {
        const fileContent = readFileSync(sampleFbPath, 'utf-8');
        expect(fileContent).toContain('export class DriveControllerInput');
    });

    test('sample-fb.ts should contain DriveControllerOutput class', () => {
        const fileContent = readFileSync(sampleFbPath, 'utf-8');
        expect(fileContent).toContain('export class DriveControllerOutput');
    });

    test('DriveController should have required decorators', () => {
        const fileContent = readFileSync(sampleFbPath, 'utf-8');
        expect(fileContent).toContain('@Static()');
        expect(fileContent).toContain('@Retain()');
        expect(fileContent).toContain('@SCLArray');
    });

    test('DriveController should have exec method with Input/Output parameters', () => {
        const fileContent = readFileSync(sampleFbPath, 'utf-8');
        expect(fileContent).toContain('public exec(');
        expect(fileContent).toContain('@Input({})');
        expect(fileContent).toContain('@Output({})');
    });
});

describe('Sample FB Compilation Tests', () => {
    const testOutputDir = 'test-output';
    const sampleFbPath = 'src/logic/sample-fb.ts';
    const expectedFiles = [
        'DriveController.fb.scl',
        'DriveControllerInput.udt',
        'DriveControllerOutput.udt',
        'DriveCalcSpeedInput.udt',
        'DriveCalcSpeedOutput.udt',
        'DriveControlInput.udt',
        'DriveControlOutput.udt',
        'motorA.instance.db',
        'motorB.instance.db'
    ];

    beforeAll(async () => {
        // Create test output directory
        if (!existsSync(testOutputDir)) {
            mkdirSync(testOutputDir, { recursive: true });
        }

        // Run the build script with only the sample-fb.ts file
        try {
            // Create a custom script that only compiles the sample-fb.ts file
            const compileScript = `
            import { MainCompiler } from './src/ts2scl/core/compilers/main-compiler.js';
            
            const compile = async () => {
                const compiler = new MainCompiler();
                await compiler.compile('${sampleFbPath}', '${testOutputDir}');
            }
            
            compile();
            `;

            // Write the script to a temporary file
            const fs = require('fs');
            fs.writeFileSync('temp-compile-script.js', compileScript);

            // Execute the script
            await execPromise(`npx tsx temp-compile-script.js`);

            // Clean up the temporary script
            fs.unlinkSync('temp-compile-script.js');
        } catch (error) {
            console.error('Error running compilation script:', error);
        }
    }, 30000); // Increase timeout to 30 seconds

    afterAll(() => {
        // Clean up test output directory
        // Commented out to preserve output files for inspection
        // rmSync(testOutputDir, { recursive: true, force: true });
    });

    test('compilation should generate output files', () => {
        // Check if the output directory exists
        const outDir = resolve(process.cwd(), testOutputDir, 'src/logic');
        expect(existsSync(outDir)).toBe(true);

        // Check if at least some of the expected files were generated
        let foundFiles = 0;
        for (const file of expectedFiles) {
            const filePath = resolve(outDir, file);
            if (existsSync(filePath)) {
                foundFiles++;
                console.log(`Found file: ${file}`);
            }
        }

        // We should find at least some of the expected files
        expect(foundFiles).toBeGreaterThan(0);
    });

    test('should generate DriveController.fb.scl file', () => {
        const fbFilePath = resolve(process.cwd(), testOutputDir, 'src/logic', 'DriveController.fb.scl');
        expect(existsSync(fbFilePath)).toBe(true);

        // Check the content of the file
        const fileContent = readFileSync(fbFilePath, 'utf-8');
        expect(fileContent).toContain('FUNCTION_BLOCK "DriveController"');
        expect(fileContent).toContain('VAR_INPUT');
        expect(fileContent).toContain('VAR_OUTPUT');
    });
}); 