const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const prompt = require('prompt-sync')();
let allParts = [];

let cookieString = '';
let headers = [];
let requestBody = '';
let requestMethod = 'GET';
let requestPath = '/';
let host = '';
let httpVersion = '';

// Function to check if a value is null or empty
function isNullOrEmpty(val) {
    return val === null || val.trim() === '';
}

// Function to read file content
async function readFile(filename) {
    return fs.promises.readFile(filename, 'utf8');
}

// Function to extract parts from the packet
function extractParts() {
    const queryParams = requestPath.split('?')[1]?.split('&') || [];
    queryParams.forEach(param => {
        const [name, value] = param.split('=');
        allParts.push({ part: 'query', name, value, force: true });
    });

    const cookies = cookieString.split(';');
    cookies.forEach(cookie => {
        const [name, value] = cookie.split('=');
        const cookieValue = cookie.replace(name.trim() + '=', '');
        allParts.push({ part: 'cookie', name: name.trim(), value: cookieValue, force: true });
        console.log(`cookie: ${name.trim()} = ${cookieValue}`);
    });

    headers.forEach(header => {
        allParts.push({ part: 'header', name: header.name, value: header.value, force: true });
    });
}

// Function to send HTTP request and capture response status and length
async function sendRequest(browser, method, requestUrl, headers, queryParams, cookies, body) {
    const headersObject = headers.reduce((acc, header) => {
        acc[header.name] = header.value;
        return acc;
    }, {});

    if (cookies.length > 0) {
        headersObject['Cookie'] = cookies.join('; ');
    }

    const urlWithParams = new URL(requestUrl);
    queryParams.forEach(param => {
        urlWithParams.searchParams.append(param.name, param.value);
    });

    const bodyContent = body !== 'null' ? body : '';

    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();

    let status;
    let length;

    await page.route('**/*', async route => {
        if (route.request().url() === urlWithParams.href) {
            const response = await page.request.fetch(route.request(), {
                method,
                headers: headersObject,
                body: bodyContent,
                maxRedirects: 0
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

// Function to test parts and determine essentials
async function testParts(browser, originalStatus, originalLength) {
    for (let i = 0; i < allParts.length; i++) {
        let part = allParts[i];
        part.force = false;

        let headers = allParts.filter(p => p.part === 'header' && p.force).map(p => ({ name: p.name, value: p.value }));
        let queryParams = allParts.filter(p => p.part === 'query' && p.force).map(p => ({ name: p.name, value: p.value }));
        let cookies = allParts.filter(p => p.part === 'cookie' && p.force).map(p => `${p.name}=${p.value}`);

        const response = await sendRequest(
            browser,
            requestMethod,
            `https://${host}${requestPath}`,
            headers,
            queryParams,
            cookies,
            requestBody
        );

        if (response.status !== originalStatus || response.length !== originalLength) {
            part.force = true;
        }

        console.log(`Testing part ${i + 1}/${allParts.length}: ${part.name} = ${part.value} | force: ${part.force}`);
    }
}

// Function to save minimized packet to file
function saveMinimizedPacket(filename) {
    const essentialHeaders = allParts.filter(part => part.part === 'header' && part.force).map(part => `${part.name}: ${part.value}`).join('\r\n');
    const essentialQueryParams = allParts.filter(part => part.part === 'query' && part.force).map(part => `${part.name}=${part.value}`).join('&');
    const essentialCookies = allParts.filter(part => part.part === 'cookie' && part.force).map(part => `${part.name}=${part.value}`).join('; ');

    console.log('Force parts:');
    console.log('Headers:', essentialHeaders);
    console.log('Query Params:', essentialQueryParams);
    console.log('Cookies:', essentialCookies);

    const minimizedPacket = `
${requestMethod} ${requestPath.split('?')[0]}${essentialQueryParams ? '?' + essentialQueryParams : ''} ${httpVersion}
Host: ${host}
${essentialHeaders}
${essentialCookies ? `Cookie: ${essentialCookies}` : ''}
\r\n
${requestBody !== 'null' ? requestBody : ''}
`.trim();

    const minimizedFilename = `${path.basename(filename)}-min`;
    fs.writeFileSync(minimizedFilename, minimizedPacket);
    console.log(`Minimized packet saved to ${minimizedFilename}`);
}

// Main function to start Playwright and handle packet minimization
(async function main() {
    const browser = await chromium.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: true,
        args: [
            '--no-sandbox',
            '--proxy-server=http://192.168.189.131:8080',
            '--ignore-certificate-errors'
        ]
    });

    const page = await browser.newPage();

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const packetFileName = await new Promise(resolve => {
        rl.question("Enter the packet file name (default: packet): ", resolve);
    });
    rl.close();

    const packet = await readFile(packetFileName);
    const packetLines = packet.split('\r\n');
    let startIndex = 2;
    let endIndex = packetLines.length - 1;
    for (let i = 0; i <= packetLines.length - 1; i++) {
        if (isNullOrEmpty(packetLines[i].trim())) {
            endIndex = i;
        }
    }

    requestBody = 'null';
    if (!isNullOrEmpty(packetLines[packetLines.length - 1])) {
        requestBody = packetLines[packetLines.length - 1].trim();
    }

    requestMethod = 'GET';
    let tempArray = packetLines[0].split(' ');
    if (!isNullOrEmpty(tempArray[0])) {
        requestMethod = tempArray[0].trim();
    }

    requestPath = '/';
    tempArray = packetLines[0].split(' ');
    if (!isNullOrEmpty(tempArray[1])) {
        requestPath = tempArray[1].trim();
        httpVersion = tempArray[2].trim();
    }

    host = '';
    tempArray = packetLines[1].split(' ');
    if (!isNullOrEmpty(tempArray[1])) {
        host = tempArray[1].trim();
    }

    cookieString = 'null';
    headers = [];

    for (let j = startIndex; j <= endIndex - 1; j++) {
        const line = packetLines[j];
        if (!isNullOrEmpty(line)) {
            const parts = line.split(':');
            try {
                const headerName = parts[0].trim();
                const headerValue = line.replace(headerName + ":", "").trim();
                if (headerName.toLowerCase() === 'cookie') {
                    cookieString = headerValue;
                } else {
                    headers.push({ name: headerName, value: headerValue });
                }
            } catch (ex) {
                console.log("Error:\n" + line);
            }
        }
    }

    console.log(`Sending original request: ${requestMethod} https://${host}${requestPath}`);

    // Sending the original request to capture the initial response
    const originalResponse = await sendRequest(
        browser,
        requestMethod,
        `https://${host}${requestPath}`,
        headers,
        [],
        [],
        requestBody
    );

    console.log('Original Packet Response:');
    console.log(`Status: ${originalResponse.status}`);
    console.log(`Length: ${originalResponse.length}`);

    extractParts();

    // Test parts and determine essentials
    await testParts(browser, originalResponse.status, originalResponse.length);

    // Save minimized packet
    saveMinimizedPacket(packetFileName);

    await browser.close();
})();
