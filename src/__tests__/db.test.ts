import { resolve } from 'path';
import { readFileSync } from 'fs';
import { MainCompiler } from '../core/main-compiler';

type BlockContent = {
    [key: string]: string[];
};

describe('DataBlock Compiler Tests', () => {
    const compiler = new MainCompiler();
    const testFile = resolve(__dirname, '../sample/sample-db.ts');
    const outputDir = resolve(__dirname, '../../dist');

    it('should successfully compile all datablocks to SCL', async () => {
        await compiler.compile(testFile, outputDir);
        const dbFiles = ['MainDB.db', 'SettingsDB.db', 'StatusDB.db'];

        for (const dbFile of dbFiles) {
            const content = readFileSync(resolve(outputDir, 'src', 'sample', dbFile), 'utf-8');

            const expectedBlocks: BlockContent = {
                'MainDB': [
                    'DATA_BLOCK "MainDB"',
                    '{ S7_Optimized_Access := \'TRUE\'; DB_Accessible_From_OPC_UA := \'TRUE\'; DB_Accessible_From_Webserver := \'TRUE\' }',
                    'VERSION : \'1.0\'',
                    'VAR',
                    'LAST_CYCLE_TIME : TIME;',
                    'PROCESS_MATRIX : ARRAY[0..2,0..3] OF "ProcessData_001";',
                    'END_VAR',
                    'VAR RETAIN',
                    'ALL_TYPES : "TestAllTypes_001";',
                    'CYCLE_COUNT : INT;',
                    'PROCESS_HISTORY : ARRAY[0..9] OF "ProcessData_001";',
                    'END_VAR'
                ],
                'SettingsDB': [
                    'DATA_BLOCK "SettingsDB"',
                    '{ S7_Optimized_Access := \'FALSE\'; DB_Accessible_From_OPC_UA := \'TRUE\' }',
                    'VERSION : \'1.0\'',
                    'READ_ONLY',
                    'VAR RETAIN',
                    'CONFIG : "Config_001";',
                    'MAINTENANCE_MODE : BOOL;',
                    'MAINTENANCE_TIMEOUT : TIME;',
                    'END_VAR'
                ],
                'StatusDB': [
                    'DATA_BLOCK "StatusDB"',
                    '{ S7_Optimized_Access := \'TRUE\' }',
                    'VERSION : \'1.0\'',
                    'UNLINKED',
                    'NON_RETAIN',
                    'VAR',
                    'CURRENT_STATUS : "Status_001";',
                    'STATUS_HISTORY : ARRAY[0..99] OF "Status_001";',
                    'LAST_ERROR_MESSAGE : STRING;',
                    'END_VAR'
                ]
            };

            const expectedInitializations: BlockContent = {
                'MainDB': [
                    'END_DATA_BLOCK'
                ],
                'SettingsDB': [
                    'BEGIN',
                    '    MAINTENANCE_MODE := FALSE;',
                    '    MAINTENANCE_TIMEOUT := T#1h;',
                    '    CONFIG.DINT_VAL := 42;',
                    '    CONFIG.INT_ARRAY[0] := 1;',
                    '    CONFIG.INT_ARRAY[1] := 2;',
                    '    CONFIG.INT_ARRAY[2] := 3;',
                    '    CONFIG.REAL_ARRAY[0] := 1.1;',
                    '    CONFIG.REAL_ARRAY[1] := 2.2;',
                    '    CONFIG.REAL_ARRAY[2] := 3.3;',
                    'END_DATA_BLOCK'
                ],
                'StatusDB': [
                    'END_DATA_BLOCK'
                ]
            };

            // Verify each data block's content
            const blockName = dbFile.replace('.db', '');
            if (expectedBlocks[blockName]) {
                expectedBlocks[blockName].forEach((line: string) => {
                    expect(content).toContain(line);
                });
            }

            // Verify initializations for each block
            if (expectedInitializations[blockName]) {
                expectedInitializations[blockName].forEach((line: string) => {
                    expect(content).toContain(line);
                });
            }
        }
    });

    it('should successfully compile SewVelocityController_BackwardForward DB to SCL', async () => {
        await compiler.compile(testFile, outputDir);
    });
}); 