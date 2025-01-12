import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('SCL Build Tests', () => {
    const testSclFile = join(__dirname, 'test-types.scl');

    test('should successfully compile SCL type with all field types', () => {
        // Run tiabuild command
        try {
            const result = execSync(`tiabuild ${testSclFile}`, {
                encoding: 'utf-8'
            });
            console.log('Command output:', result);
            
            // Verify compilation succeeded by checking command output
            expect(result).toBeDefined();
            expect(result).not.toContain('error');
            expect(result).not.toContain('Error');
            
            // Verify successful compilation message
            expect(result).toContain('Project compiled with result: Success');
            expect(result).toContain('All external source files processed successfully');
            expect(result).toContain('Generated blocks from external source: test-types');
        } catch (error: any) {
            console.log('Command error:', error.message);
            throw error;
        }
    });
}); 