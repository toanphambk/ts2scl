import fs from 'fs';
import { exec } from 'child_process';
import path from 'path';

const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

const watchDirectory = (dir: fs.PathLike) => {
    const processFiles = () => {
        fs.readdir(dir, { withFileTypes: true }, (err, files) => {
            if (err) {
                console.error(`Error reading directory ${dir}: ${err.message}`);
                return;
            }
            files.forEach(file => {
                const fullPath = path.join(dir.toString(), file.name);
                if (file.isDirectory()) {
                    watchDirectory(fullPath);
                } else if (file.isFile() && path.extname(file.name) === '.scl') {
                    const debouncedExec = debounce((fullPath: string) => {
                        exec(`tiabuild ${fullPath}`, (error, stdout, stderr) => {
                            if (error) {
                                console.error(`Error executing tiabuild: ${error.message}`);
                                return;
                            }
                            if (stderr) {
                                console.error(`tiabuild stderr: ${stderr}`);
                                return;
                            }
                            console.log(`tiabuild stdout: ${stdout}`);
                        });
                    }, 1000); // Adjust debounce time as needed

                    fs.watch(fullPath, (eventType, filename) => {
                        if (eventType === 'change') {
                            debouncedExec(fullPath);
                        }
                    });
                }
            });
        });
        processFiles();
    };


    // Continuously watch the directory for changes
    const debouncedExec = debounce((fullPath: string) => {
        exec(`tiabuild ${fullPath}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing tiabuild: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`tiabuild stderr: ${stderr}`);
                return;
            }
            console.log(`tiabuild stdout: ${stdout}`);
        });
    }, 300); // Adjust debounce time as needed

    fs.watch(dir, { recursive: true }, (eventType, filename) => {
        if (filename && path.extname(filename) === '.scl') {
            console.log(`${filename} file Changed`);
            const fullPath = path.join(dir.toString(), filename);
            debouncedExec(fullPath);
        }
    });
};

watchDirectory(__dirname);


