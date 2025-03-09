import { resolve } from 'path';
import { readFileSync } from 'fs';
import { MainCompiler } from '../core';

describe('Function Compiler Tests', () => {
    const compiler = new MainCompiler();
    const testFile = resolve(__dirname, '../sample/sample-fc.ts');
    const outputDir = resolve(__dirname, '../../dist');

    it('should successfully compile DriveCalculateSpeed FC to SCL', async () => {
        await compiler.compile(testFile, outputDir);
        const content = readFileSync(resolve(outputDir, 'src', 'sample', 'DriveCalculateSpeed.fc.scl'), 'utf-8');

        const expectedLines = [
            'FUNCTION "DriveCalculateSpeed" : INT',
            'VAR_INPUT',
            '    input : "DriveCalcSpeedInput";',
            'END_VAR',
            'VAR_OUTPUT',
            '    output : "DriveCalcSpeedOutput";',
            'END_VAR',
            'VAR_TEMP',
            '    tempStatusWord : WORD;',
            '    tempCalcSpeed : INT;',
            'END_VAR',
            'BEGIN',
            '    #tempStatusWord := W#16#0000;',
            '    #tempCalcSpeed := 100;',
            '    #output.isRunning := FALSE;',
            '    #tempStatusWord := #input.status;',
            '    IF NOT #input.enable THEN',
            '            #output.calculatedSpeed := 0;',
            '            #DriveCalculateSpeed := 0;',
            '    END_IF;',
            '    IF #tempStatusWord = W#16#0003 THEN',
            '            IF #input.targetSpeed > 1000 THEN',
            '                    #tempCalcSpeed := 50;',
            '                    #output.isRunning := FALSE;',
            '            ELSE',
            '                    #tempCalcSpeed := 100;',
            '                    #output.isRunning := TRUE;',
            '            END_IF;',
            '    ELSIF #tempStatusWord = W#16#0004 THEN',
            '            IF #input.targetSpeed > 2000 THEN',
            '                    #tempCalcSpeed := 800;',
            '                    #output.isRunning := TRUE;',
            '            ELSE',
            '                    #tempCalcSpeed := 500;',
            '                    #output.isRunning := TRUE;',
            '            END_IF;',
            '    ELSIF #tempStatusWord = W#16#0008 THEN',
            '            IF #input.targetSpeed > 3000 THEN',
            '                    #tempCalcSpeed := 600;',
            '                    #output.isRunning := TRUE;',
            '            ELSIF #input.targetSpeed > 2000 THEN',
            '                    #tempCalcSpeed := 500;',
            '                    #output.isRunning := TRUE;',
            '            ELSE',
            '                    #tempCalcSpeed := 300;',
            '                    #output.isRunning := TRUE;',
            '            END_IF;',
            '    ELSE',
            '            IF #input.targetSpeed > 4000 THEN',
            '                    #tempCalcSpeed := 3200;',
            '                    #output.isRunning := TRUE;',
            '            ELSE',
            '                    #tempCalcSpeed := #input.targetSpeed;',
            '                    #output.isRunning := TRUE;',
            '            END_IF;',
            '    END_IF;',
            '    #output.calculatedSpeed := #tempCalcSpeed;',
            '    #DriveCalculateSpeed := #tempCalcSpeed;',
            'END_FUNCTION'
        ];

        expectedLines.forEach((line: string) => {
            expect(content).toContain(line.trim());
        });
    });

    it('should successfully compile DriveControl FC to SCL', async () => {
        const content = readFileSync(resolve(outputDir, 'src', 'sample', 'DriveControl.fc.scl'), 'utf-8');

        const expectedLines = [
            'FUNCTION "DriveControl" : INT',
            'VAR_INPUT',
            '    input : "DriveControlInput";',
            'END_VAR',
            'VAR_OUTPUT',
            '    output : "DriveControlOutput";',
            'END_VAR',
            'VAR_TEMP',
            '    tempDriveStatus : WORD;',
            '    tempResult : INT;',
            '    calculatedSpeed : INT;',
            '    calcSpeedInput : "DriveControllerInput";',
            '    calcSpeedOutput : "DriveControllerOutput";',
            'END_VAR',
            'BEGIN',
            '    #tempDriveStatus := W#16#0000;',
            '    #calcSpeedInput.enable := #input.enable;',
            '    #calcSpeedInput.targetSpeed := #input.setSpeed;',
            '    "motorA"(input := #calcSpeedInput,',
            'output => #calcSpeedOutput);',
            '    "motorB"(input := #calcSpeedInput,',
            'output => #calcSpeedOutput);',
            '    #calculatedSpeed := #calcSpeedOutput.actualSpeed;',
            '    #output.actualSpeed := #calculatedSpeed;',
            '    #output.driveStatus := #tempDriveStatus;',
            '    #DriveControl := #tempResult;',
            'END_FUNCTION'
        ];

        expectedLines.forEach((line: string) => {
            expect(content).toContain(line.trim());
        });
    });

    it('should successfully compile ComparisonTest FC to SCL', async () => {
        const content = readFileSync(resolve(outputDir, 'src', 'sample', 'ComparisonTest.fc.scl'), 'utf-8');

        const expectedLines = [
            'FUNCTION "ComparisonTest" : BOOL',
            'VAR_INPUT',
            '    intValue1 : INT;',
            '    intValue2 : INT;',
            '    realValue1 : REAL;',
            '    realValue2 : REAL;',
            '    timeValue1 : TIME;',
            '    timeValue2 : TIME;',
            '    strValue1 : STRING;',
            '    strValue2 : STRING;',
            'END_VAR',
            'VAR_OUTPUT',
            '    intEqual : BOOL;',
            '    intNotEqual : BOOL;',
            '    intGreater : BOOL;',
            '    intLessEqual : BOOL;',
            '    realEqual : BOOL;',
            '    realGreater : BOOL;',
            '    realLessEqual : BOOL;',
            '    timeGreater : BOOL;',
            '    timeLessEqual : BOOL;',
            '    strEqual : BOOL;',
            '    strNotEqual : BOOL;',
            'END_VAR',
            'VAR_TEMP',
            '    tempInt1 : INT;',
            '    tempInt2 : INT;',
            '    tempReal1 : REAL;',
            '    tempReal2 : REAL;',
            '    tempTime1 : TIME;',
            '    tempTime2 : TIME;',
            '    tempStr1 : STRING;',
            '    tempStr2 : STRING;',
            '    result : BOOL;',
            'END_VAR',
            'BEGIN',
            '    #tempInt1 := #intValue1;',
            '    #tempInt2 := #intValue2;',
            '    #tempReal1 := #realValue1;',
            '    #tempReal2 := #realValue2;',
            '    #tempTime1 := #timeValue1;',
            '    #tempTime2 := #timeValue2;',
            '    #tempStr1 := #strValue1;',
            '    #tempStr2 := #strValue2;',
            // Integer comparisons
            '    #intEqual := #tempInt1 = #tempInt2;',
            '    #intNotEqual := #tempInt1 <> #tempInt2;',
            '    #intGreater := #tempInt1 > #tempInt2;',
            '    #intLessEqual := #tempInt1 <= #tempInt2;',
            // Real comparisons
            '    #realEqual := #tempReal1 = #tempReal2;',
            '    #realGreater := #tempReal1 > #tempReal2;',
            '    #realLessEqual := #tempReal1 <= #tempReal2;',
            // Time comparisons
            '    #timeGreater := #tempTime1 > #tempTime2;',
            '    #timeLessEqual := #tempTime1 <= #tempTime2;',
            // String comparisons
            '    #strEqual := #tempStr1 = #tempStr2;',
            '    #strNotEqual := #tempStr1 <> #tempStr2;',
            // Complex condition
            '    #result := ((#tempInt1 > 0 AND #tempReal1 >= 0.00) OR (#tempTime1 > T#1s AND #tempStr1 = \'OK\'));',
            '    #ComparisonTest := #result;',
            'END_FUNCTION'
        ];

        expectedLines.forEach((line: string) => {
            expect(content).toContain(line.trim());
        });
    });

    it('should correctly handle instance function calls in DriveControl FC', async () => {
        await compiler.compile(testFile, outputDir);
        const content = readFileSync(resolve(outputDir, 'src', 'sample', 'DriveControl.fc.scl'), 'utf-8');

        // Test the instance function call
        const expectedInstanceCall = [
            '    #calcSpeedInput.enable := #input.enable;',
            '    #calcSpeedInput.targetSpeed := #input.setSpeed;',
            '    "motorA"(input := #calcSpeedInput,',
            'output => #calcSpeedOutput);',
            '    "motorB"(input := #calcSpeedInput,',
            'output => #calcSpeedOutput);',
            '    #calculatedSpeed := #calcSpeedOutput.actualSpeed;',
            '    #output.driveStatus := #tempDriveStatus;',
            '    #DriveControl := #tempResult;'
        ];

        expectedInstanceCall.forEach((line: string) => {
            expect(content).toContain(line.trim());
        });
    });
}); 