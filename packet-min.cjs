const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const url = require('url');
const prompt = require('prompt-sync')();

// Function to parse the HTTP packet
async function parseHttpPacket(packet) {
    const parts = packet.split('\r\n\r\n');
    const headersPart = parts[0];
    const bodyPart = parts[1] || '';

    const headersLines = headersPart.split('\r\n');
    const requestLine = headersLines[0];
    const headers = headersLines.slice(1);

    // Extract the Host header value
    const hostHeader = headers.find(header => header.startsWith('Host:'));
    const host = hostHeader ? hostHeader.split(': ')[1] : 'example.com';

    // Parse query string parameters
    const [method, requestPath, version] = requestLine.split(' ');
    const protocol = 'https';  // Always use https for the protocol
    const fullUrl = `${protocol}://${host}${requestPath}`;
    const parsedUrl = new url.URL(fullUrl);
    const queryParams = parsedUrl.searchParams;

    // Parse POST body parameters (assuming JSON format)
    let postBodyParams = {};
    if (bodyPart.trim().startsWith('{')) {
        try {
            postBodyParams = JSON.parse(bodyPart);
        } catch (error) {
            console.error('Error parsing POST body as JSON:', error);
        }
    }

    return {
        method,
        requestUrl: fullUrl,
        version,
        headers,
        body: bodyPart,
        queryParams,
        postBodyParams
    };
}

// Function to send HTTP request and capture response status and length
async function sendRequest(browser, method, requestUrl, headers, queryParams, cookies, body, totalRequests, currentRequest) {
    // Ensure headers is always an array using JSON trick
    headers = JSON.parse(JSON.stringify(headers));

    // Calculate the progress percentage
    const progress = ((currentRequest / totalRequests) * 100).toFixed(2);
    console.log(`Sending request ${currentRequest + 1} of ${totalRequests}... Progress: ${progress}%`);

    // Convert headers array to an object, ensure it has at least an empty object
    const headersObject = {};
    if (headers.length > 0) {
        headers.forEach(header => {
            const [key, value] = header.split(': ');
            headersObject[key] = value;
        });
    }

    if (cookies.length > 0) {
        headersObject['Cookie'] = cookies.join('; ');
    }

    const urlWithParams = new url.URL(requestUrl);
    for (const [key, value] of queryParams) {
        urlWithParams.searchParams.append(key, value);
    }

    const bodyContent = JSON.stringify(body);

    const context = await browser.newContext({
        ignoreHTTPSErrors: true  // Ignore HTTPS errors
    });
    const page = await context.newPage();

    let status;
    let length;

    // Intercept the request and continue with custom headers and body
    await page.route('**/*', async route => {
        if (route.request().url() === urlWithParams.href) {
            const response = await page.request.fetch(route.request(), {
                method,
                headers: headersObject,
                body: bodyContent,
                maxRedirects: 0 // Do not follow redirects
            });

            status = response.status();
            length = (await response.body()).length;

            route.fulfill({
                status,
                headers: response.headers(),
                body: await response.body()
            });
        } else {
            route.continue();
        }
    });

    await page.goto(urlWithParams.href);

    await context.close();
    return { status, length };
}

// Function to test headers, query parameters, and POST body parameters
async function testHeadersAndParams(browser, parsedPacket, originalStatus, originalLength) {
    const { method, requestUrl, headers, queryParams, postBodyParams } = parsedPacket;
    const essentialHeaders = [];
    const essentialParams = [];
    const essentialCookies = [];
    const essentialBodyParams = [];

    // Total number of tests to run
    const totalTests = headers.length + [...queryParams.entries()].length + Object.keys(postBodyParams).length;
    let currentTest = 0;

    // Test headers
    for (let i = 0; i < headers.length; i++) {
        const testHeaders = headers.filter((_, index) => index !== i);
        const response = await sendRequest(browser, method, requestUrl, testHeaders, queryParams, [], postBodyParams, totalTests, currentTest++);
        if (response.status === originalStatus && response.length === originalLength) {
            essentialHeaders.push(headers[i]);
        }
    }

    // Test query parameters
    for (const [key, value] of queryParams.entries()) {
        const testParams = new url.URLSearchParams(queryParams);
        testParams.delete(key);
        const response = await sendRequest(browser, method, requestUrl, testParams, [], postBodyParams, totalTests, currentTest++);
        if (response.status === originalStatus && response.length === originalLength) {
            essentialParams.push([key, value]);
        }
    }

    // Test cookies
    const cookieHeader = headers.find(header => header.startsWith('Cookie:'));
    if (cookieHeader) {
        const cookies = cookieHeader.split(': ')[1].split('; ');
        for (let i = 0; i < cookies.length; i++) {
            const testCookies = cookies.filter((_, index) => index !== i);
            const testHeaders = headers.filter(header => !header.startsWith('Cookie:'));
            const response = await sendRequest(browser, method, requestUrl, testHeaders, queryParams, testCookies, postBodyParams, totalTests, currentTest++);
            if (response.status === originalStatus && response.length === originalLength) {
                essentialCookies.push(cookies[i]);
            }
        }
    }

    // Test POST body parameters
    for (const [key, value] of Object.entries(postBodyParams)) {
        const testBodyParams = { ...postBodyParams };
        delete testBodyParams[key];
        const response = await sendRequest(browser, method, requestUrl, headers, queryParams, [], testBodyParams, totalTests, currentTest++);
        if (response.status === originalStatus && response.length === originalLength) {
            essentialBodyParams.push([key, value]);
        }
    }

    return { essentialHeaders, essentialParams, essentialCookies, essentialBodyParams };
}

// Function to save minimized packet to file
function saveMinimizedPacket(parsedPacket, essentials, originalFilename) {
    const {
        essentialHeaders,
        essentialParams,
        essentialCookies,
        essentialBodyParams
    } = essentials;

    const minimizedPacket = `
${parsedPacket.method} ${parsedPacket.requestUrl} ${parsedPacket.version}
${essentialHeaders.join('\r\n')}
\r\n
${JSON.stringify(Object.fromEntries(essentialParams))}
${essentialCookies.length > 0 ? `Cookie: ${essentialCookies.join('; ')}` : ''}
\r\n
${JSON.stringify(Object.fromEntries(essentialBodyParams))}
`.trim();

    const minimizedFilename = `Originalpacket-${path.basename(originalFilename)}-min`;
    fs.writeFileSync(minimizedFilename, minimizedPacket);
    console.log(`Minimized packet saved to ${minimizedFilename}`);
}

// Main function to start Playwright and handle packet minimization
(async () => {
    const packetFilePath = prompt('Enter the HTTP packet file path: ');
    const packet = fs.readFileSync(packetFilePath, 'utf8');
    const parsedPacket = await parseHttpPacket(packet);

    const browser = await chromium.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: true, // Set to true if you don't need a browser UI
        args: [
            '--proxy-server=http://192.168.189.131:8080' // Replace with your proxy server and port
        ]
    });

    const originalResponse = await sendRequest(
        browser,
        parsedPacket.method,
        parsedPacket.requestUrl,
        parsedPacket.headers,
        parsedPacket.queryParams,
        [],
        parsedPacket.postBodyParams,
        1, 0
    );

    console.log('Original Packet Response:');
    console.log(`Status: ${originalResponse.status}`);
    console.log(`Length: ${originalResponse.length}`);

    const confirmation = prompt('Do you want to continue with the minimization process? (yes/no): ');
    if (confirmation.toLowerCase() !== 'yes') {
        console.log('Process aborted by user.');
        await browser.close();
        return;
    }

    const { essentialHeaders, essentialParams, essentialCookies, essentialBodyParams } = await testHeadersAndParams(
        browser,
        parsedPacket,
        originalResponse.status,
        originalResponse.length
    );

    console.log('Essential Headers:', essentialHeaders);
    console.log('Essential Query Params:', essentialParams);
    console.log('Essential Cookies:', essentialCookies);
    console.log('Essential Body Params:', essentialBodyParams);

    saveMinimizedPacket(parsedPacket, { essentialHeaders, essentialParams, essentialCookies, essentialBodyParams }, packetFilePath);

    await browser.close();
})();
