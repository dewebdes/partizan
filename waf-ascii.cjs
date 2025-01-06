const { chromium } = require('playwright');
const readline = require('readline');
const url = require('url');
const fs = require('fs');

// Generate a timestamp string
const generateTimestamp = () => {
    const date = new Date();
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}-${date.getMinutes().toString().padStart(2, '0')}-${date.getSeconds().toString().padStart(2, '0')}`;
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

(async () => {
    // Prompt user for input
    const targetUrl = await new Promise(resolve => rl.question('Please enter the target URL: ', resolve));
    const paramName = await new Promise(resolve => rl.question('Please enter the parameter name: ', resolve));
    const staticValue = await new Promise(resolve => rl.question('Please enter the static value for the parameter: ', resolve));
    rl.close();

    const browser = await chromium.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: true, // Make the browser headless
        args: [
            '--no-sandbox',
            '--proxy-server=http://192.168.189.131:8082',
            '--ignore-certificate-errors'
        ]
    });
    const page = await browser.newPage();

    // Set default timeout to a higher value (e.g., 60 seconds)
    page.setDefaultTimeout(60000);

    // Generate a unique results file name with timestamp
    const timestamp = generateTimestamp();
    const resultsFilePath = `filtered_results_${timestamp}.csv`;

    // Parse query parameters from the URL
    const parsedUrl = new URL(targetUrl);
    const queryParams = new URLSearchParams(parsedUrl.search);

    if (!queryParams.keys().next().value) {
        console.log('No query parameters found in the URL.');
        await browser.close();
        process.exit(1);
    }

    // Function to fetch the response status, body, and response time
    const getResponseDetails = async (url) => {
        try {
            const startTime = Date.now();
            await page.goto(url, { waitUntil: 'networkidle' });
            const endTime = Date.now();
            const status = await page.evaluate(() => document.readyState === 'complete' ? 200 : 400);
            const body = await page.content();
            const responseTime = endTime - startTime;
            return { status, body, responseTime };
        } catch (error) {
            console.log(`Error while waiting for response: ${url}`);
            return { status: 'Error', body: '', responseTime: 'N/A' };
        }
    };

    // Get the original response details
    const originalResponse = await getResponseDetails(targetUrl);

    // List of ASCII characters to test (0 to 127), excluding a-z and 0-9
    const asciiChars = [];
    for (let i = 0; i < 128; i++) {
        const char = String.fromCharCode(i);
        if ((i >= 48 && i <= 57) || (i >= 65 && i <= 90) || (i >= 97 && i <= 122)) {
            continue; // Skip a-z, A-Z, and 0-9
        }
        asciiChars.push({ code: i });
    }

    // Function to test each ASCII character and its encodings
    const testAsciiChar = async ({ code }) => {
        const results = [];
        const testValues = [
            { type: 'Original', value: `${staticValue}${String.fromCharCode(code)}` },
        ];

        for (const { type, value } of testValues) {
            queryParams.set(paramName, value);
            const testUrl = `${parsedUrl.origin}${parsedUrl.pathname}?${queryParams.toString()}`;
            const { status, body, responseTime } = await getResponseDetails(testUrl);

            if (status !== originalResponse.status || !body.includes(value)) {
                results.push({ code, type, status, responseTime, filtered: true });
                console.log(`Character (${code}) [${type}] is filtered. Status: ${status}, Response Time: ${responseTime}ms`);

                // Test encoded versions if the original is filtered
                const encodedTestValues = [
                    { type: 'URL Encoded', value: `${staticValue}${encodeURIComponent(String.fromCharCode(code))}` },
                    { type: 'Double URL Encoded', value: `${staticValue}${encodeURIComponent(encodeURIComponent(String.fromCharCode(code)))}` },
                    { type: 'HTML Encoded', value: `${staticValue}${htmlEncode(String.fromCharCode(code))}` }
                ];

                for (const { type: encType, value: encValue } of encodedTestValues) {
                    queryParams.set(paramName, encValue);
                    const encTestUrl = `${parsedUrl.origin}${parsedUrl.pathname}?${queryParams.toString()}`;
                    const encResponseDetails = await getResponseDetails(encTestUrl);

                    const filtered = encResponseDetails.status !== originalResponse.status || !encResponseDetails.body.includes(encValue);
                    results.push({
                        code,
                        type: encType,
                        status: encResponseDetails.status,
                        responseTime: encResponseDetails.responseTime,
                        filtered: filtered
                    });

                    console.log(`Character (${code}) [${encType}] is ${filtered ? 'filtered' : 'not filtered'}. Status: ${encResponseDetails.status}, Response Time: ${encResponseDetails.responseTime}ms`);

                    // If the character is not filtered in this encoding, skip the remaining encodings
                    if (!filtered) {
                        break;
                    }

                    // Add a 1-second delay between each request (considering there are 5 workers)
                    console.log(`Waiting for 1 second before the next request...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } else {
                console.log(`Character (${code}) [${type}] is not filtered. Status: ${status}, Response Time: ${responseTime}ms`);
            }

            // Add a 1-second delay between each request (considering there are 5 workers)
            console.log(`Waiting for 1 second before the next request...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return results;
    };

    const htmlEncode = (char) => {
        const htmlEntities = {
            '<': '&lt;',
            '>': '&gt;',
            '&': '&amp;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;',
        };
        return htmlEntities[char] || char;
    };

    // Loop through ASCII characters and test each one
    const filteredResults = [];
    for (const [index, charObj] of asciiChars.entries()) {
        console.log(`\nTesting character ${index + 1}/${asciiChars.length}: (${charObj.code})`);
        const charResults = await testAsciiChar(charObj);
        filteredResults.push(...charResults.filter(result => result.filtered));
    }

    // Save filtered results to a CSV file
    const csvContent = 'ASCII Code,Type,Status,ResponseTime(ms),Filtered\n' +
        filteredResults.map(result => `${result.code},${result.type},${result.status},${result.responseTime},${result.filtered}`).join('\n');
    fs.writeFileSync(resultsFilePath, csvContent);

    console.log(`Filtered results saved to ${resultsFilePath}`);

    await browser.close();
})();
