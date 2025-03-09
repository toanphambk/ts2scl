#!/usr/bin/env node

import { convertTypeToSCL } from './index.js';
import { readFileSync } from 'fs';

// Simple CLI implementation
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log(`
TS2SCL - TypeScript to Siemens SCL Converter

Usage:
  ts2scl <command> [options]

Commands:
  convert <file>     Convert TypeScript file to SCL
  help               Show this help message

Options:
  --output, -o       Output file path
  --version, -v      Show version
  `);
    process.exit(0);
}

const command = args[0];

switch (command) {
    case 'help':
        console.log(`
TS2SCL - TypeScript to Siemens SCL Converter

Usage:
  ts2scl <command> [options]

Commands:
  convert <file>     Convert TypeScript file to SCL
  help               Show this help message

Options:
  --output, -o       Output file path
  --version, -v      Show version
  `);
        break;

    case 'version':
    case '--version':
    case '-v':
        // Read version from package.json
        const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
        console.log(`TS2SCL version ${packageJson.version}`);
        break;

    case 'convert':
        if (args.length < 2) {
            console.error('Error: No input file specified');
            process.exit(1);
        }

        const inputFile = args[1];
        let outputFile: string | null = null;

        // Check for output file option
        const outputIndex = args.findIndex(arg => arg === '--output' || arg === '-o');
        if (outputIndex !== -1 && args.length > outputIndex + 1) {
            outputFile = args[outputIndex + 1];
        }

        console.log(`Converting ${inputFile} to SCL...`);
        // TODO: Implement actual file conversion
        console.log('Conversion not yet implemented in CLI');
        break;

    default:
        console.error(`Unknown command: ${command}`);
        console.log('Use "ts2scl help" to see available commands');
        process.exit(1);
} 