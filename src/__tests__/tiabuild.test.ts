import { execSync } from 'child_process';
import * as path from 'path';

describe('TIA Portal Build Tests', () => {
    const testDir = path.resolve(__dirname, '../../dist');
    const outsclDir = path.resolve(testDir, '');

    it('should verify TIA Portal build', async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const result = execSync(`tiabuild "${outsclDir}"`, { encoding: 'utf-8' });
        console.log('TIA Build output:', result);

    });
}); 