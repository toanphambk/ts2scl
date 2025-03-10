import { readdir } from "fs/promises";
import { MainCompiler } from "./core/compilers/main-compiler";

const inputDir = "src/logic/"
const outputDir = "outScl"

const compile = async () => {
    const compiler = new MainCompiler();
    const inputFiles = await readdir(inputDir, { recursive: true }).then(files => files.filter(file => file.endsWith('.ts')));

    for (const file of inputFiles) {
        await compiler.compile(`${inputDir}/${file}`, outputDir);
    }
}

compile();
