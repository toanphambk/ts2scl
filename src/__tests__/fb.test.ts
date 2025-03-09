import { resolve } from 'path';
import { readFileSync } from 'fs';
import { MainCompiler } from '../index';

describe('Function Block Compiler Tests', () => {
    const compiler = new MainCompiler();
    const testFile = resolve(__dirname, '../sample/sample-fb.ts');
    const outputDir = resolve(__dirname, '../../dist');

    it('should successfully compile DriveController FB and its types', async () => {
        await compiler.compile(testFile, outputDir);

        // Check the input UDT
        const inputUdtContent = readFileSync(resolve(outputDir, 'src', 'sample', 'DriveControllerInput.udt'), 'utf-8');
        const expectedInputUdtLines = [
            'TYPE "DriveControllerInput"',
            'STRUCT',
            '    parameters : INT;',
            '    enable : BOOL;',
            '    targetSpeed : INT;',
            '    safetyEnabled : BOOL;',
            '    speedLimits : ARRAY[0..9] OF INT;',
            'END_STRUCT',
            'END_TYPE'
        ];
        expectedInputUdtLines.forEach(line => {
            expect(inputUdtContent).toContain(line.trim());
        });

        // Check the output UDT
        const outputUdtContent = readFileSync(resolve(outputDir, 'src', 'sample', 'DriveControllerOutput.udt'), 'utf-8');
        const expectedOutputUdtLines = [
            'TYPE "DriveControllerOutput"',
            'STRUCT',
            '    status : WORD;',
            '    errorStatus : WORD;',
            '    actualSpeed : INT;',
            '    isRunning : BOOL;',
            '    isSafetyActive : BOOL;',
            '    runtime : INT;',
            '    speedHistory : ARRAY[0..9] OF INT;',
            'END_STRUCT',
            'END_TYPE'
        ];
        expectedOutputUdtLines.forEach(line => {
            expect(outputUdtContent).toContain(line.trim());
        });

        // Check the function block
        const fbContent = readFileSync(resolve(outputDir, 'src', 'sample', 'DriveController.fb.scl'), 'utf-8');
        const expectedFbLines = [
            'FUNCTION_BLOCK "DriveController"',
            'VAR_INPUT',
            '    input : "DriveControllerInput";',
            'END_VAR',
            'VAR_OUTPUT',
            '    output : "DriveControllerOutput";',
            'END_VAR',
            'VAR RETAIN',
            '    lastSpeed : INT;',
            '    maxSpeed : INT;',
            '    errorCount : INT;',
            '    totalRuntime : INT;',
            'END_VAR',
            'VAR',
            '    statusHistory : ARRAY[0..4] OF WORD;',
            '    speedBuffer : ARRAY[0..4] OF INT;',
            '    statusWord : WORD;',
            '    currentMode : INT;',
            '    safetyStatus : WORD;',
            'END_VAR',
            'VAR_TEMP',
            '    tempStatus : WORD;',
            '    tempSpeed : INT;',
            '    tempMode : INT;',
            '    calculatedSpeed : INT;',
            '    driveStatus : WORD;',
            '    isSpeedValid : BOOL;',
            '    actualDriveSpeed : INT;',
            '    arrayIndex : INT;',
            '    calcSpeedInput : "DriveCalcSpeedInput";',
            '    calcSpeedOutput : "DriveCalcSpeedOutput";',
            '    driveCtrlInput : "DriveControlInput";',
            '    driveCtrlOutput : "DriveControlOutput";',
            '    errorCounter : INT;',
            '    validationStatus : BOOL;',
            '    i : INT;',
            '    j : INT;',
            'END_VAR',
            'BEGIN',
            '    #tempStatus := W#16#0000;',
            '    #tempSpeed := 0;',
            '    #tempMode := 0;',
            '    #calculatedSpeed := 0;',
            '    #driveStatus := W#16#0000;',
            '    #actualDriveSpeed := 0;',
            '    #arrayIndex := 0;',
            '    #calcSpeedInput.enable := FALSE;',
            '    #calcSpeedInput.targetSpeed := 0;',
            '    #calcSpeedInput.status := 0;',
            '    #calcSpeedOutput.calculatedSpeed := 0;',
            '    #calcSpeedOutput.isRunning := FALSE;',
            '    #driveCtrlInput.enable := FALSE;',
            '    #driveCtrlInput.setSpeed := 0;',
            '    #driveCtrlOutput.driveStatus := 0;',
            '    #driveCtrlOutput.actualSpeed := 0;',
            '    #errorCounter := 0;',
            '    FOR #i := 3 TO 0 BY -1 DO',
            '        #statusHistory[#i + 1] := #statusHistory[#i];',
            '    END_FOR;',
            '    #statusHistory[0] := #statusWord;'
        ];

        // Test the complex for loop with nested if statements
        const complexForLoopLines = [
            'FOR #i := 0 TO #input.speedLimits.length BY 2 DO',
            'IF #input.speedLimits[#i] > 0 THEN',
            'IF #i < 5 THEN',
            '#output.speedHistory[#i] := #input.speedLimits[#i];',
            'IF #i MOD 2 = 0 AND #input.safetyEnabled THEN',
            '#output.speedHistory[#i] := (#output.speedHistory[#i] * 8) / 10;',
            'END_IF;',
            'ELSE',
            'FOR #j := 0 TO 3 DO',
            'IF #i + #j < #input.speedLimits.length THEN',
            '#output.speedHistory[#i] := #input.speedLimits[#i + #j];',
            'END_IF;',
            'END_FOR;',
            'END_IF;',
            'ELSE',
            '#output.speedHistory[#i] := 0;',
            'END_IF;',
            'END_FOR;'
        ];

        // Add the complex for loop lines to the expected lines
        expectedFbLines.push(...complexForLoopLines);

        // Add the remaining expected lines
        const remainingLines = [
            'IF #input.speedLimits[0] > 0 AND #calculatedSpeed > #input.speedLimits[0] THEN',
            '#calculatedSpeed := #input.speedLimits[0];',
            'END_IF;',
            'IF #input.safetyEnabled THEN',
            '#safetyStatus := W#16#0001;',
            '#output.isSafetyActive := TRUE;',
            'ELSE',
            '#safetyStatus := W#16#0000;',
            '#output.isSafetyActive := FALSE;',
            'END_IF;',
            'IF NOT #input.enable THEN',
            '#output.actualSpeed := 0;',
            '#output.isRunning := FALSE;',
            '#output.status := #statusWord;',
            '#output.errorStatus := W#16#0000;',
            'END_IF;'
        ];
        expectedFbLines.push(...remainingLines);

        expectedFbLines.forEach(line => {
            expect(fbContent).toContain(line.trim());
        });
    });

    it('should correctly handle complex for loops with nested if statements', async () => {
        // This test specifically focuses on the complex for loop
        const fbContent = readFileSync(resolve(outputDir, 'src', 'sample', 'DriveController.fb.scl'), 'utf-8');

        // Check for proper nesting and indentation in the complex for loop
        const expectedNestedStructure = [
            'FOR #i := 0 TO #input.speedLimits.length BY 2 DO',
            '    IF #input.speedLimits[#i] > 0 THEN',
            '        IF #i < 5 THEN',
            '            #output.speedHistory[#i] := #input.speedLimits[#i];',
            '            IF #i MOD 2 = 0 AND #input.safetyEnabled THEN',
            '                #output.speedHistory[#i] := (#output.speedHistory[#i] * 8) / 10;',
            '            END_IF;',
            '        ELSE',
            '            FOR #j := 0 TO 3 DO',
            '                IF #i + #j < #input.speedLimits.length THEN',
            '                    #output.speedHistory[#i] := #input.speedLimits[#i + #j];',
            '                END_IF;',
            '            END_FOR;',
            '        END_IF;',
            '    ELSE',
            '        #output.speedHistory[#i] := 0;',
            '    END_IF;',
            'END_FOR;'
        ];

        // Check that the structure is preserved in the generated code
        // We'll check for the presence of key nested elements
        expect(fbContent).toContain('FOR #i := 0 TO #input.speedLimits.length BY 2 DO');
        expect(fbContent).toContain('IF #input.speedLimits[#i] > 0 THEN');
        expect(fbContent).toContain('IF #i < 5 THEN');
        expect(fbContent).toContain('IF #i MOD 2 = 0 AND #input.safetyEnabled THEN');
        expect(fbContent).toContain('FOR #j := 0 TO 3 DO');
        expect(fbContent).toContain('IF #i + #j < #input.speedLimits.length THEN');
    });

    it('should correctly handle while loops with nested if statements', async () => {
        // This test specifically focuses on the while loop
        const fbContent = readFileSync(resolve(outputDir, 'src', 'sample', 'DriveController.fb.scl'), 'utf-8');

        // Check for proper while loop structure
        expect(fbContent).toContain('WHILE #errorCounter < #errorCount DO');
        expect(fbContent).toContain('#errorCounter := #errorCounter + 1;');
        expect(fbContent).toContain('IF #errorCounter > 10 THEN');
        expect(fbContent).toContain('#tempStatus := W#16#8000;');
        expect(fbContent).toContain('ELSE');
        expect(fbContent).toContain('#tempStatus := W#16#4000;');
        expect(fbContent).toContain('END_IF;');
        expect(fbContent).toContain('END_WHILE;');
    });

    // it('should correctly handle do-while loops as REPEAT-UNTIL structures', async () => {
    //     // This test specifically focuses on the REPEAT-UNTIL structure
    //     const fbContent = readFileSync(resolve(outputDir, 'src', 'sample', 'DriveController.fb.scl'), 'utf-8');

    //     // Check for proper REPEAT-UNTIL structure
    //     expect(fbContent).toContain('REPEAT');
    //     expect(fbContent).toContain('IF #i < #input.speedLimits.length AND #input.speedLimits[#i] > 0 THEN');
    //     expect(fbContent).toContain('#validationStatus := TRUE;');
    //     expect(fbContent).toContain('#i := #i + 1;');
    //     expect(fbContent).toContain('UNTIL NOT #validationStatus AND #i < #input.speedLimits.length END_REPEAT;');
    // });

    it('should correctly handle break statements as EXIT in loops', async () => {
        // This test specifically focuses on the break statement
        const fbContent = readFileSync(resolve(outputDir, 'src', 'sample', 'DriveController.fb.scl'), 'utf-8');

        // Check for proper FOR loop with EXIT
        expect(fbContent).toContain('FOR #i := 15 TO 1 BY -2 DO');
        expect(fbContent).toContain('IF #i < 5 THEN');
        expect(fbContent).toContain('EXIT;');
        expect(fbContent).toContain('END_IF;');
        expect(fbContent).toContain('IF #i < #input.speedLimits.length THEN');
        expect(fbContent).toContain('#output.speedHistory[#i] := 1;');
    });
}); 