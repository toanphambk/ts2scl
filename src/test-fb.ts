// Test script for converting the sample FB to SCL
import { convertTypeToSCL } from './index.js';
import { DriveController } from './sample/sample-fb.js';

console.log('TS2SCL - Testing FB Conversion');
console.log('==============================');

// Convert the DriveController FB to SCL
console.log('\nConverting DriveController to SCL...');
const sclCode = convertTypeToSCL<DriveController>('DriveController');

// Output the result
console.log('\nGenerated SCL Code:');
console.log('------------------');
console.log(sclCode);

console.log('\nConversion test complete!'); 