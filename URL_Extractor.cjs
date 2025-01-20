const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const stringSimilarity = require('string-similarity');
const { chromium } = require('playwright');
const url = require('url');

const dangerousSinks = [
    'eval', 'innerHTML', 'document.write', 'setTimeout', 'setInterval', 'location.href', 'location.assign',
    'location.replace', 'Function', 'setAttribute', 'onclick', 'insertAdjacentHTML', 'window.open',
    'XMLHttpRequest', 'fetch', 'document.domain', 'window.name', 'history.pushState', 'history.replaceState',
    'localStorage.setItem', 'sessionStorage.setItem', 'indexedDB.open', 'WebSocket.send', 'document.cookie',
    'document.open', 'document.close', 'document.implementation.createHTMLDocument', 'document.implementation.createDocument',
    'document.implementation.createDocumentFragment', 'document.implementation.createNodeIterator', 'document.implementation.createTreeWalker'
];

const cleanOutputFolder = (folderPath) => {
    if (fs.existsSync(folderPath)) {
        fs.readdirSync(folderPath).forEach((file) => {
            const curPath = path.join(folderPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                cleanOutputFolder(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        console.log(`Cleaned output folder: ${folderPath}`);
    }
};

// Function to read hostnames from file
const readHostnamesFromFile = (filename) => {
    const filePath = path.resolve(__dirname, filename);
    return fs.readFileSync(filePath, 'utf8').split('\n').map(line => line.trim()).filter(Boolean);
};

if (isMainThread) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    let worker;
    const outputDir = path.resolve(__dirname, 'output');
    cleanOutputFolder(outputDir);

    // Define chunkSize
    const chunkSize = 8192;

    // Prompt for the file containing hostnames
    rl.question('Please enter the filename containing the hostnames: ', async (filename) => {
        const hostnames = readHostnamesFromFile(filename);
        await processHostnames(hostnames);
        rl.close();
    });

    const processHostnames = async (hostnames) => {
        for (const hostname of hostnames) {
            await new Promise((resolve) => {
                worker = new Worker(__filename, { workerData: { hostname, outputDir } });

                worker.on('message', (message) => {
                    if (message.type === 'save') {
                        saveLogsToFile(hostname, message.urlLog, outputDir);
                        resolve();
                    }
                });

                worker.on('exit', () => {
                    console.log(`Finished processing ${hostname}`);
                    resolve();
                });
            });
        }
        console.log('All hostnames have been processed.');
    };


    let hostCounter = 1; // Global counter for host numbering

    const saveLogsToFile = (hostname, urlLog, outputDir) => {
        // Save URLs log
        const groupedUrls = groupUrls(urlLog);
        const finalUrls = calculateSimilarity(groupedUrls);

        // Filter out hosts that only have a root path ("/")
        const filteredUrls = finalUrls.filter(urlObj => urlObj.url !== '/');

        // Detect and retain the shortest URL from similar patterns
        const shortestUrls = retainShortestUrls(filteredUrls);

        if (shortestUrls.length > 0) {
            let currentContent = `Host-${hostCounter}: ${hostname}\n\n`;

            shortestUrls.forEach((urlObj) => {
                const transformedUrl = urlObj.url.replace(new RegExp(`^https?://${hostname}`, 'i'), '');
                urlObj.transformedUrl = transformedUrl;
                currentContent += `${transformedUrl}\n`;
            });

            // Add space after each host's URLs
            currentContent += `\n\n`;

            // Append to the file instead of overwriting
            fs.appendFileSync(path.join(outputDir, 'urls.txt'), currentContent.trim() + '\n\n', 'utf8');
            console.log(`URLs for ${hostname} have been appended to "urls.txt" in the "output" directory.`);

            // Increment the host counter
            hostCounter++;
        } else {
            console.log(`No valid URLs found for ${hostname}.`);
        }
    };

    // Function to retain the shortest URL from similar patterns
    const retainShortestUrls = (urls) => {
        const uniqueUrls = [];

        urls.forEach((urlObj) => {
            let isUnique = true;

            for (let i = 0; i < uniqueUrls.length; i++) {
                if (stringSimilarity.compareTwoStrings(urlObj.url, uniqueUrls[i].url) > 0.85) {
                    // Retain the shortest URL
                    if (urlObj.url.length < uniqueUrls[i].url.length) {
                        uniqueUrls[i] = urlObj;
                    }
                    isUnique = false;
                    break;
                }
            }

            if (isUnique) {
                uniqueUrls.push(urlObj);
            }
        });

        return uniqueUrls;
    };





    const groupUrls = (urls) => {
        const groups = {};
        urls.forEach((urlObj) => {
            const baseUrl = urlObj.url.split('?')[0];
            const key = baseUrl.split('/').slice(0, -1).join('/') + ':' + baseUrl.length;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(urlObj);
        });
        return Object.values(groups).map(group => group[group.length - 1]);
    };

    const calculateSimilarity = (urls) => {
        const uniqueUrls = [];
        urls.forEach((urlObj) => {
            let isUnique = true;
            for (let i = 0; i < uniqueUrls.length; i++) {
                if (stringSimilarity.compareTwoStrings(urlObj.url, uniqueUrls[i].url) > 0.85) {
                    isUnique = false;
                    break;
                }
            }
            if (isUnique) {
                uniqueUrls.push(urlObj);
            }
        });
        return uniqueUrls;
    };

} else {
    const { hostname, outputDir } = workerData;

    let urlLog = [];
    let requests = [];
    const urlToRequestIndexMap = {};

    const removeProtocolAndHost = (url) => {
        try {
            const urlObj = new URL(url);
            return urlObj.pathname + urlObj.search;
        } catch (e) {
            return url;
        }
    };

    const createPacketString = (requestPacket, hostname) => {
        const headersObject = JSON.parse(JSON.stringify(requestPacket.headers));
        const headersString = Object.entries(headersObject).map(([name, value]) => `${name}: ${value}`).join('\r\n');
        const requestLine = `${requestPacket.method} ${requestPacket.url} HTTP/1.1`;
        const body = requestPacket.postData || '';
        const hostHeader = `Host: ${hostname}`;
        return `${requestLine}\r\n${hostHeader}\r\n${headersString}\r\n\r\n${body}`;
    };

    const startPlaywright = async (hostname, outputDir) => {
        const chromePath = path.resolve(__dirname, 'C:\\Program Files\\Google\\Chrome\\Application', 'chrome.exe');
        const startupAddress = `https://${hostname}`;

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        const browser = await chromium.launch({
            executablePath: chromePath,
            headless: true,
            bypassCSP: true,
            ignoreHTTPSErrors: true,
            javaScriptEnabled: true,
            acceptDownloads: true,
            permissions: ['geolocation', 'notifications'],
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            viewport: { width: 1280, height: 720 },
            recordHar: { path: 'network_logs.har', mode: 'full' },
            offline: false,
            extraHTTPHeaders: {
                'Cache-Control': 'no-cache'
            }
        });

        const page = await browser.newPage();

        page.on('request', request => {
            const url = request.url();
            if (url.includes(hostname)) {
                const strippedUrl = removeProtocolAndHost(url);
                console.log(`Request: ${strippedUrl}`);
                const packetString = createPacketString({
                    url: strippedUrl,
                    headers: request.headers(),
                    method: request.method(),
                    postData: request.postData(),
                }, hostname);
                requests.push({
                    url: strippedUrl,
                    headers: request.headers(),
                    method: request.method(),
                    postData: request.postData(),
                    packetString,
                });
                urlLog.push({ url: strippedUrl, packetString });
                urlToRequestIndexMap[strippedUrl] = requests.length - 1;
            }
        });

        page.on('response', async response => {
            const url = response.url();
            if (url.includes(hostname)) {
                const strippedUrl = removeProtocolAndHost(url);
                console.log(`Response: ${strippedUrl}`);
            }
        });

        try {
            await page.goto(startupAddress);
            console.log('Page loaded successfully');
        } catch (error) {
            console.error('Playwright navigation error:', error);
        }

        console.log('Browser is open. Interact with the page and close the browser when done.');
        await browser.close();
        console.log('Browser closed.');

        parentPort.postMessage({ type: 'save', urlLog });
    };

    startPlaywright(hostname, outputDir);
}
