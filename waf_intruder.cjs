const fs = require('fs');
const readline = require('readline');
const axios = require('axios');
const https = require('https');
const path = require('path');
const playwright = require('playwright');

// Create a prompt to get user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const promptUser = (query) => {
    return new Promise((resolve) => rl.question(query, resolve));
};

// Function to generate a timestamp-based filename
const generateTimestampFilename = (prefix) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Format: 2025-03-28T10-29-30
    return `${prefix}-${timestamp}.txt`;
};

// Function to remove duplicate matches
const removeDuplicateMatches = (matches) => {
    const uniqueSet = new Set();
    return matches.filter((match) => {
        const isNew = ![...uniqueSet].some((existing) => match.startsWith(existing));
        if (isNew) uniqueSet.add(match);
        return isNew;
    });
};

(async () => {
    try {
        // Prompt for file paths
        const packetFilePath = await promptUser('Please enter the file path containing the HTTP packet: ');
        const payloadsFilePath = await promptUser('Please enter the file path containing the payloads: ');
        const regexInput = await promptUser('Please enter a regex pattern to search for in the response: ');

        const packetTemplate = fs.readFileSync(packetFilePath, 'utf-8');
        const payloads = fs.readFileSync(payloadsFilePath, 'utf-8').split('\n').filter(Boolean); // Get payloads from file
        const regex = new RegExp(regexInput, 'g');

        // Initialize HTML log structure
        const logFilePath = path.resolve(path.dirname(packetFilePath), 'fuzz-results.html');
        let htmlContent = `
            <html>
            <head>
                <title>Fuzz Results</title>
                <meta http-equiv="refresh" content="5">
            </head>
            <body>
                <h1>Fuzz Results</h1>
                <table border="1">
                    <thead>
                        <tr>
                            <th>Payload</th>
                            <th>Status Code</th>
                            <th>Regex Matches</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Write the initial structure to the HTML file (resetting any old content)
        fs.writeFileSync(logFilePath, htmlContent, 'utf-8');
        console.log(`HTML log file initialized: ${logFilePath}`);

        // Use Playwright to open the log file
        const chromePath = path.resolve(__dirname, 'C:\\Program Files\\Google\\Chrome\\Application', 'chrome.exe');
        const browser = await playwright.chromium.launch({
            headless: false,
            executablePath: chromePath,
        });
        const page = await browser.newPage();
        await page.goto(`file://${logFilePath}`);

        // Store all matches for processing later
        const allMatches = [];

        // Function to send HTTP requests
        const sendRequest = async (packet, payload) => {
            const [methodLine, ...headerLines] = packet.split('\n');
            const [method, url] = methodLine.split(' ');
            const headers = {};
            let body = null;

            for (const line of headerLines) {
                if (!line.includes(': ')) continue;
                const [key, value] = line.split(': ');
                headers[key.trim()] = value.trim();
            }

            let fullUrl = url;
            if (!url.startsWith('http')) {
                const host = headers['Host'];
                if (!host) throw new Error('Host header is missing.');
                fullUrl = `https://${host}${url}`;
            }

            const config = {
                method,
                url: fullUrl,
                headers,
                data: body,
                proxy: {
                    host: '127.0.0.1',
                    port: 8082,
                },
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            };

            try {
                const response = await axios(config);
                const responseText = `HTTP/1.1 ${response.status} ${response.statusText}\n` +
                    Object.entries(response.headers).map(([key, value]) => `${key}: ${value}`).join('\n') +
                    `\n\n${response.data}`;
                return { payload, status: response.status, matches: (responseText.match(regex) || []), responseText };
            } catch (error) {
                const responseCode = error.response ? error.response.status : 'Unknown';
                const responseText = `HTTP/1.1 ${responseCode}\n` +
                    `${error.response ? Object.entries(error.response.headers).map(([key, value]) => `${key}: ${value}`).join('\n') : ''}` +
                    `\n\n${error.response ? error.response.data : 'No response data'}`;
                return { payload, status: responseCode, matches: (responseText.match(regex) || []), responseText };
            }
        };

        // Test Request
        console.log('Sending test request...');
        const testResult = await sendRequest(packetTemplate.replace(/FUZZ/g, ''), 'Test Request (No Payload)');

        // Save the test request response to a file with timestamp
        const testResponseFilePath = path.resolve(
            path.dirname(packetFilePath),
            generateTimestampFilename('test-response')
        );
        fs.writeFileSync(testResponseFilePath, testResult.responseText, 'utf-8'); // Save full response to file
        console.log(`Test request full response saved to: ${testResponseFilePath}`);
        console.log(`Regex matches for test request: ${testResult.matches.join(', ') || 'No matches found'}`);

        // Log test request response to HTML
        htmlContent += `
            <tr>
                <td>${testResult.payload.replace(/"/g, '&quot;')}</td>
                <td>${testResult.status}</td>
                <td>${testResult.matches.map(match => match).join('<br>') || 'No matches'}</td>
            </tr>
        `;

        const continueFuzzing = await promptUser('Test request completed. Continue with fuzzing? (y/n): ');
        if (continueFuzzing.toLowerCase() !== 'y') {
            console.log('Fuzzing aborted by user.');
            htmlContent += `
                    </tbody>
                </table>
            </body>
            </html>`;
            fs.writeFileSync(logFilePath, htmlContent, 'utf-8');
            await page.reload();
            console.log('HTML log finalized. Browser will remain open.');
            return; // Exit without closing the browser
        }
        console.log('Starting fuzzing...');
        const totalPayloads = payloads.length;

        for (let i = 0; i < totalPayloads; i++) {
            const payload = payloads[i];
            const modifiedPacket = packetTemplate.replace(/FUZZ/g, payload);
            const result = await sendRequest(modifiedPacket, payload);

            // Append matches to the consolidated list
            allMatches.push(...result.matches);

            // Append results to the HTML log
            htmlContent += `
                <tr>
                    <td>${result.payload.replace(/"/g, '&quot;')}</td>
                    <td>${result.status}</td>
                    <td>${result.matches.map(match => match).join('<br>') || 'No matches'}</td>
                </tr>
            `;

            // Write and reload every 10 payloads or on the final payload
            if ((i + 1) % 10 === 0 || i === totalPayloads - 1) {
                fs.writeFileSync(logFilePath, htmlContent + '</tbody></table></body></html>', 'utf-8');
                try {
                    await page.reload();
                } catch (reloadError) {
                    console.error('Error during page reload:', reloadError.message);
                    break;
                }
            }

            // Calculate and log percentage completed
            const percentage = Math.round(((i + 1) / totalPayloads) * 100);
            console.log(`Progress: ${percentage}% completed`);
        }

        // Consolidate matches into a unique list and remove duplicates
        const uniqueMatches = removeDuplicateMatches(allMatches);

        // Save the consolidated matches to a text file
        const matchesFilePath = path.resolve(
            path.dirname(packetFilePath),
            generateTimestampFilename('consolidated-matches')
        );
        fs.writeFileSync(matchesFilePath, uniqueMatches.join('\n'), 'utf-8');
        console.log(`Consolidated regex matches saved to: ${matchesFilePath}`);

        console.log('Fuzzing completed. Results logged in fuzz-results.html.');
        console.log('Browser will remain open. You can close it manually when ready.');
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        rl.close(); // Close the readline interface but keep the browser open
    }
})();
