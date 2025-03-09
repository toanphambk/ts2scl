import { resolve } from 'path';
import { readFileSync } from 'fs';
import { MainCompiler } from '../index';

type TypeContent = {
    [key: string]: string[];
};

describe('Type Compiler Tests', () => {
    const compiler = new MainCompiler();
    const testFile = resolve(__dirname, '../sample/sample-types.ts');
    const outputDir = resolve(__dirname, '../../dist');

    it('should successfully compile all types to SCL', async () => {
        await compiler.compile(testFile, outputDir);

        const typeFiles = [
            'AlarmConfig_001.udt',
            'Config_001.udt',
            'Status_001.udt',
            'ProcessData_001.udt',
            'Matrix_001.udt',
            'TimeTest_001.udt',
            'TestAllTypes_001.udt'
        ];

        const expectedTypes: TypeContent = {
            'AlarmConfig_001': [
                'TYPE "AlarmConfig_001"',
                'STRUCT',
                '    ENABLED : BOOL;',
                '    PRIORITY : INT;',
                '    DELAY_TIME : TIME;',
                "    MESSAGE : STRING;",
                '    ACKNOWLEDGEMENT_REQUIRED : BOOL;',
                '    ALARM_CLASS : INT;',
                '    ALARM_GROUP : INT;',
                'END_STRUCT;',
                'END_TYPE',
            ],
            'Config_001': [
                'TYPE "Config_001"',
                'STRUCT',
                '    DINT_VAL : INT;',
                '    INT_ARRAY : ARRAY[0..10] OF INT;',
                '    REAL_ARRAY : ARRAY[0..10] OF REAL;',
                'END_STRUCT;',
                'END_TYPE',
            ],
            'Status_001': [
                'TYPE "Status_001"',
                'STRUCT',
                '    STATE_IDLE : BOOL;',
                '    STATE_RUNNING : BOOL;',
                '    STATE_ERROR : BOOL;',
                'END_STRUCT;',
                'END_TYPE',
            ],
            'ProcessData_001': [
                'TYPE "ProcessData_001"',
                'STRUCT',
                '    POSITION : INT;',
                '    VELOCITY : REAL;',
                '    IS_MOVING : BOOL;',
                'END_STRUCT;',
                'END_TYPE',
            ],
            'Matrix_001': [
                'TYPE "Matrix_001"',
                'STRUCT',
                '    GRID_INT : ARRAY[0..3,0..3] OF INT;',
                '    GRID_REAL : ARRAY[0..3,0..3] OF REAL;',
                '    GRID_BOOL : ARRAY[0..3,0..3] OF BOOL;',
                '    CUBE_INT : ARRAY[0..3,0..3,0..3] OF INT;',
                '    CUBE_REAL : ARRAY[0..3,0..3,0..3] OF REAL;',
                '    CUBE_BOOL : ARRAY[0..3,0..3,0..3] OF BOOL;',
                'END_STRUCT;',
                'END_TYPE',
            ],
            'TimeTest_001': [
                'TYPE "TimeTest_001"',
                'STRUCT',
                '    SIMPLE_SECOND : TIME;',
                '    MILLISECONDS : TIME;',
                '    HOUR_AND_HALF : TIME;',
                '    COMPLEX_TIME : TIME;',
                '    TWO_DAYS : TIME;',
                '    TIME_ARRAY : ARRAY[0..5] OF TIME;',
                '    EQUIVALENT_TIMES : ARRAY[0..2] OF TIME;',
                '    COMPLEX_TIME_ARRAY : ARRAY[0..2] OF TIME;',
                'END_STRUCT;',
                'END_TYPE',
            ],
            'TestAllTypes_001': [
                'TYPE "TestAllTypes_001"',
                'STRUCT',
                '    CONFIG : "Config_001";',
                '    STATUS : "Status_001";',
                '    PROCESS_DATA : "ProcessData_001";',
                '    MATRIX : "Matrix_001";',
                '    ALARM_CONFIG : "AlarmConfig_001";',
                '    ALARM_HISTORY : ARRAY[0..9] OF "Status_001";',
                '    GRID : ARRAY[0..3,0..3] OF "ProcessData_001";',
                'END_STRUCT;',
                'END_TYPE',
            ],
        };

        // Verify each type's content in its own file
        for (const typeFile of typeFiles) {
            const content = readFileSync(resolve(outputDir, 'src', 'sample', typeFile), 'utf-8');
            const typeName = typeFile.replace('.udt', '');

            if (expectedTypes[typeName]) {
                expectedTypes[typeName].forEach((line: string) => {
                    expect(content).toContain(line);
                });
            }
        }

    });
});
