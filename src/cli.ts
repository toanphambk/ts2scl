#!/usr/bin/env node

import { convertTypeToSCL } from './index.js';
import { MainCompiler } from './core/main-compiler.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, readdirSync } from 'fs';
import path from 'path';

// Function to process a file or directory recursively
function processPath(inputPath: string, outputDir: string, compiler: MainCompiler): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
        try {
            const stats = statSync(inputPath);

            if (stats.isFile()) {
                // Process single file
                if (inputPath.endsWith('.ts')) {
                    console.log(`Processing file: ${inputPath}`);
                    const success = await compiler.compile(inputPath, outputDir);
                    resolve(success);
                } else {
                    console.log(`Skipping non-TypeScript file: ${inputPath}`);
                    resolve(true);
                }
            } else if (stats.isDirectory()) {
                // Process directory recursively
                console.log(`Processing directory: ${inputPath}`);
                const files = readdirSync(inputPath);
                const results = await Promise.all(
                    files.map(file => {
                        const filePath = path.join(inputPath, file);
                        return processPath(filePath, outputDir, compiler);
                    })
                );

                // If any file failed, return false
                resolve(results.every(result => result));
            } else {
                console.log(`Skipping: ${inputPath} (not a file or directory)`);
                resolve(true);
            }
        } catch (error) {
            reject(error);
        }
    });
}

// Simple CLI implementation
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log(`
TS2SCL - TypeScript to Siemens SCL Converter

Usage:
  ts2scl <command> [options]

Commands:
  convert <path>     Convert TypeScript file or directory to SCL
  compile <path>     Compile TypeScript file or directory to SCL using the MainCompiler
  help               Show this help message

Options:
  --output, -o       Output file or directory path
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
  convert <path>     Convert TypeScript file or directory to SCL
  compile <path>     Compile TypeScript file or directory to SCL using the MainCompiler
  help               Show this help message

Options:
  --output, -o       Output file or directory path
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
            console.error('Error: No input path specified');
            process.exit(1);
        }

        const inputPath = args[1];
        let outputPath: string | null = null;

        // Check for output path option
        const outputIndex = args.findIndex(arg => arg === '--output' || arg === '-o');
        if (outputIndex !== -1 && args.length > outputIndex + 1) {
            outputPath = args[outputIndex + 1];
        }

        try {
            const stats = statSync(inputPath);

            if (stats.isFile()) {
                // Process single file
                console.log(`Converting file: ${inputPath} to SCL...`);

                if (!inputPath.endsWith('.ts')) {
                    console.error('Error: Input file must be a TypeScript file (.ts)');
                    process.exit(1);
                }

                // Simple conversion using convertTypeToSCL
                const typeName = path.basename(inputPath, path.extname(inputPath));
                const sclCode = convertTypeToSCL(typeName);

                if (outputPath) {
                    writeFileSync(outputPath, sclCode);
                    console.log(`SCL code saved to ${outputPath}`);
                } else {
                    console.log('\nGenerated SCL Code:');
                    console.log('------------------');
                    console.log(sclCode);
                }
            } else if (stats.isDirectory()) {
                // Process directory
                console.log(`Converting directory: ${inputPath} to SCL...`);

                if (!outputPath) {
                    outputPath = './scl-output';
                }

                // Ensure output directory exists
                if (!existsSync(outputPath)) {
                    mkdirSync(outputPath, { recursive: true });
                }

                // Process all TypeScript files in the directory recursively
                const processDirectory = (dirPath: string) => {
                    const files = readdirSync(dirPath);

                    files.forEach(file => {
                        const filePath = path.join(dirPath, file);
                        const stats = statSync(filePath);

                        if (stats.isFile() && file.endsWith('.ts')) {
                            console.log(`Converting file: ${filePath}`);

                            // Simple conversion using convertTypeToSCL
                            const typeName = path.basename(filePath, path.extname(filePath));
                            const sclCode = convertTypeToSCL(typeName);

                            // Create output file path
                            const relativePath = path.relative(inputPath, filePath);
                            const outputFilePath = path.join(outputPath!, relativePath.replace('.ts', '.scl'));

                            // Ensure output directory exists
                            const outputFileDir = path.dirname(outputFilePath);
                            if (!existsSync(outputFileDir)) {
                                mkdirSync(outputFileDir, { recursive: true });
                            }

                            // Write SCL code to file
                            writeFileSync(outputFilePath, sclCode);
                            console.log(`SCL code saved to ${outputFilePath}`);
                        } else if (stats.isDirectory()) {
                            processDirectory(filePath);
                        }
                    });
                };

                processDirectory(inputPath);
                console.log('\nConversion complete!');
            } else {
                console.error('Error: Input path is not a file or directory');
                process.exit(1);
            }
        } catch (error) {
            console.error('Error during conversion:', error);
            process.exit(1);
        }
        break;

    case 'compile':
        if (args.length < 2) {
            console.error('Error: No input path specified');
            process.exit(1);
        }

        const inputCompilePath = args[1];
        let outputDir = './scl-output';

        // Check for output directory option
        const outputDirIndex = args.findIndex(arg => arg === '--output' || arg === '-o');
        if (outputDirIndex !== -1 && args.length > outputDirIndex + 1) {
            outputDir = args[outputDirIndex + 1];
        }

        // Ensure output directory exists
        if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
        }

        console.log(`Compiling ${inputCompilePath} to SCL...`);
        console.log(`Output directory: ${outputDir}`);

        try {
            const compiler = new MainCompiler();

            // Check if input is a file or directory
            const stats = statSync(inputCompilePath);

            if (stats.isFile()) {
                // Process single file
                compiler.compile(inputCompilePath, outputDir)
                    .then(success => {
                        if (success) {
                            console.log('\nCompilation successful!');
                        } else {
                            console.error('\nCompilation failed.');
                            process.exit(1);
                        }
                    })
                    .catch(error => {
                        console.error('Error during compilation:', error);
                        process.exit(1);
                    });
            } else if (stats.isDirectory()) {
                // Process directory recursively
                processPath(inputCompilePath, outputDir, compiler)
                    .then(success => {
                        if (success) {
                            console.log('\nCompilation of all files successful!');
                        } else {
                            console.error('\nCompilation of some files failed.');
                            process.exit(1);
                        }
                    })
                    .catch(error => {
                        console.error('Error during compilation:', error);
                        process.exit(1);
                    });
            } else {
                console.error('Error: Input path is not a file or directory');
                process.exit(1);
            }
        } catch (error) {
            console.error('Error initializing compiler:', error);
            process.exit(1);
        }
        break;

    default:
        console.error(`Unknown command: ${command}`);
        console.log('Use "ts2scl help" to see available commands');
        process.exit(1);
} 