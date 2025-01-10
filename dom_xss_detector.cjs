const playwright = require('playwright');
const fs = require('fs');
const readline = require('readline');

// Function to prompt user for input
const prompt = (query) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => rl.question(query, (ans) => {
        rl.close();
        resolve(ans);
    }));
};

// Function to load parameters from a file
const loadParameters = (filename) => {
    try {
        const data = fs.readFileSync(filename, 'utf8');
        return data.split('\n').map(param => param.trim()).filter(param => param.length > 0);
    } catch (err) {
        console.error(`Error reading file: ${err}`);
        return [];
    }
};

// Function to chunk parameters
const chunkArray = (array, size) => {
    const chunkedArray = [];
    for (let i = 0; i < array.length; i += size) {
        chunkedArray.push(array.slice(i, i + size));
    }
    return chunkedArray;
};

// Function to generate a random 4-character string
const generateRandomString = () => {
    return Math.random().toString(36).substring(2, 6);
};

const main = async () => {
    const url = await prompt('Enter the URL: ');
    const paramsFile = await prompt('Enter the parameters filename: ');
    const value = await prompt('Enter the value to search for: ');

    const parameters = loadParameters(paramsFile);
    const chunks = chunkArray(parameters, 5);
    const totalChunks = chunks.length;

    const browser = await playwright.chromium.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: true,
        args: [
            '--no-sandbox',
            '--proxy-server=http://192.168.189.131:8082',
            '--ignore-certificate-errors'
        ]
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    const results = {};
    const logFileName = 'reflection_results.log';

    // Function to make requests with chunks of parameters
    const testParameters = async (chunk) => {
        let queryParams = '';
        let randomStrings = {};

        chunk.forEach(param => {
            const randomString = generateRandomString();
            randomStrings[param] = randomString;
            queryParams += `${param}=${value}${randomString}&`;
        });

        const testUrl = `${url}?${queryParams.slice(0, -1)}`;
        console.log(`Testing URL: ${testUrl}`);

        await page.goto(testUrl, { timeout: 60000 });

        // Get page content
        const content = await page.content();

        // Search for the value in the page content
        chunk.forEach(param => {
            const paramValue = `${value}${randomStrings[param]}`;
            let reflectionCount = (content.match(new RegExp(paramValue, 'g')) || []).length;
            results[param] = reflectionCount;
            console.log(`Tested ${param}: ${reflectionCount} reflections\n`);
        });
    };

    // Process each chunk of parameters
    for (let i = 0; i < totalChunks; i++) {
        await testParameters(chunks[i]);

        // Show progress percentage
        const progress = ((i + 1) / totalChunks) * 100;
        console.log(`Progress: ${progress.toFixed(2)}%`);

        // Introduce a delay to spread out requests
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3-second delay

        // Print the results sorted by reflection count
        console.clear();
        console.log('Reflections sorted by count:');
        const sortedResults = Object.entries(results).sort((a, b) => b[1] - a[1]);
        sortedResults.forEach(([param, count]) => {
            console.log(`${param}: ${count}`);
        });

        // Save results to log file
        fs.writeFileSync(logFileName, sortedResults.map(([param, count]) => `${param}: ${count}`).join('\n'), 'utf8');
    }

    await browser.close();

    console.log(`Results saved to ${logFileName}`);
};

main();
