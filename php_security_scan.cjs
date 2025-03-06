const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Function to get folder location from user
async function getFolderLocation() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question('Enter the folder path to scan: ', (folder) => {
            rl.close();
            resolve(folder);
        });
    });
}

// Function to recursively search files for security-relevant keywords
function searchFolderForKeywords(folderPath, keywords, outputFile, basePath) {
    fs.readdir(folderPath, { withFileTypes: true }, (err, files) => {
        if (err) {
            console.error(`Error reading directory ${folderPath}:`, err.message);
            return;
        }

        files.forEach((file) => {
            const filePath = path.join(folderPath, file.name);

            if (file.isDirectory()) {
                // Recursively search subdirectory
                searchFolderForKeywords(filePath, keywords, outputFile, basePath);
            } else if (file.isFile() && file.name.endsWith('.php')) {
                // Read the file and search for keywords
                fs.readFile(filePath, 'utf8', (err, data) => {
                    if (err) {
                        console.error(`Error reading file ${filePath}:`, err.message);
                        return;
                    }

                    keywords.forEach((keyword) => {
                        if (data.includes(keyword)) {
                            const relativePath = path.relative(basePath, filePath); // Get relative path
                            fs.appendFileSync(outputFile, `${keyword}|${relativePath}\n`, 'utf8');
                        }
                    });
                });
            }
        });
    });
}

// Function to chunk results in the log file
function writeChunksToLog(keywords, folderPath, outputFile) {
    if (fs.existsSync(outputFile)) {
        // Create a new file to store results chunked by keywords
        const chunkedOutput = path.join(folderPath, 'chunked_scan_results.txt');
        fs.writeFileSync(chunkedOutput, '', 'utf8'); // Clear file before writing chunks

        keywords.forEach((keyword) => {
            const findings = fs
                .readFileSync(outputFile, 'utf8')
                .split('\n')
                .filter((line) => line.startsWith(`${keyword}|`))
                .map((line) => line.split('|')[1]); // Extract only the file paths

            if (findings.length > 0) {
                const chunk = `=== Results for "${keyword}" ===\n` + findings.join('\n') + '\n\n';
                fs.appendFileSync(chunkedOutput, chunk, 'utf8');
            }
        });

        console.log(`Chunked results saved to: ${chunkedOutput}`);
    }
}

// Main script logic
(async function main() {
    const keywords = [
        // Add all relevant PHP keywords here
        '$_GET', '$_POST', '$_REQUEST', '$_COOKIE', '$_FILES', '$_SERVER', '$_ENV', 'php://input',
        'eval', 'exec', 'system', 'passthru', 'shell_exec', 'proc_open', 'popen', 'pcntl_exec',
        'assert', 'include', 'require', 'include_once', 'require_once', 'create_function',
        'fopen', 'file_get_contents', 'file_put_contents', 'readfile', 'unlink', 'move_uploaded_file',
        'copy', 'rename', 'opendir', 'readdir', 'rmdir', 'preg_replace', 'preg_match', 'preg_split',
        'str_replace', 'substr_replace', 'addslashes', 'htmlspecialchars', 'htmlentities',
        'mysql_query', 'mysqli_query', 'PDO::query', 'PDO::prepare', 'header', 'setcookie',
        'session_start', 'serialize', 'unserialize', 'base64_decode', 'parse_str', 'call_user_func',
        'call_user_func_array'
    ];

    const folderPath = await getFolderLocation();

    if (fs.existsSync(folderPath) && fs.lstatSync(folderPath).isDirectory()) {
        const outputFile = path.join(folderPath, 'scan_results_raw.txt');
        console.log(`Scanning folder: ${folderPath}`);
        console.log(`Raw findings will be saved in: ${outputFile}`);

        // Clear previous results if the file exists
        if (fs.existsSync(outputFile)) {
            fs.unlinkSync(outputFile); // Remove the old file to start fresh
        }

        searchFolderForKeywords(folderPath, keywords, outputFile, folderPath);
        setTimeout(() => writeChunksToLog(keywords, folderPath, outputFile), 5000); // Delay for log creation
    } else {
        console.error('Invalid folder path. Please enter a valid directory.');
    }
})();
