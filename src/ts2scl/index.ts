import { readdir } from "fs/promises";
import { MainCompiler } from "./core/compilers/main-compiler";
import { Command } from "commander";

// Create command line interface
const program = new Command();

program
    .name('ts2scl')
    .description('Convert TypeScript to Siemens SCL code')
    .version('1.0.1')
    .option('-i, --input <path>', 'Input file or directory path')
    .option('-o, --output <path>', 'Output directory path')
    .allowExcessArguments(true) // Allow extra arguments
    .parse(process.argv);       // Parse arguments only once

const options = program.opts();
const inputDir = options.input;
const outputDir = options.output;

const compile = async () => {
    const compiler = MainCompiler.getInstance();

    try {
        // Check if input path is a file with .ts extension
        if (inputDir.endsWith('.ts')) {
            // For single file, process it and its imports
            console.log(`Processing file: ${inputDir}`);
            await compiler.processFileAndImportsRecursively(inputDir);
            console.log(`Compiling file: ${inputDir}`);
            await compiler.compile(inputDir, outputDir);
            console.log(`Successfully compiled ${inputDir} to ${outputDir}`);
        } else {
            // Process directory
            const inputFiles = await readdir(inputDir, { recursive: true })
                .then(files => files.filter(file => file.endsWith('.ts')));

            if (inputFiles.length === 0) {
                console.log(`No TypeScript files found in ${inputDir}`);
                return;
            }

            // First, process all files to collect metadata in parallel
            console.log(`Processing ${inputFiles.length} files to collect metadata...`);
            const processingPromises = inputFiles.map(file => {
                const fullPath = `${inputDir}/${file}`;
                return compiler.processFileAndImportsRecursively(fullPath);
            });
            await Promise.all(processingPromises);

            // Then, compile all files using the collected metadata in parallel
            console.log(`Compiling ${inputFiles.length} files...`);
            const compilationPromises = inputFiles.map(file => {
                const fullPath = `${inputDir}/${file}`;
                return compiler.compile(fullPath, outputDir);
            });
            await Promise.all(compilationPromises);

            console.log(`Successfully compiled ${inputFiles.length} files from ${inputDir} to ${outputDir}`);
        }
    } catch (error) {
        console.error('Compilation failed:', error);
    }
};

compile();

