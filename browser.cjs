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

if (isMainThread) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    let hostname = '';
    let worker;

    const outputDir = path.resolve(__dirname, 'output');
    cleanOutputFolder(outputDir);

    rl.question('Please enter the hostname (e.g., example.com): ', (answer) => {
        hostname = answer.trim();
        startPlaywright(hostname);
    });

    rl.on('line', async (input) => {
        const parts = input.trim().split(' ');
        const command = parts[0].toLowerCase();
        if (command === 'save') {
            if (worker) {
                worker.postMessage('save');
            }
        } else if (command === 'exit') {
            rl.close();
            process.exit(0);
        } else if (command === 'min' && parts.length === 2) {
            const urlLineNumber = parseInt(parts[1], 10);
            if (!isNaN(urlLineNumber)) {
                await handleMinCommand(urlLineNumber);
            } else {
                console.log('Invalid url-line-number.');
            }
        } else {
            console.log(`Received input: ${input.trim()}`);
        }
    });

    const handleMinCommand = async (urlLineNumber) => {
        if (urlLineNumber < 1 || urlLineNumber > global.finalUrls.length) {
            console.log('Invalid line number.');
            return;
        }

        const finalUrl = global.finalUrls[urlLineNumber - 1];
        if (finalUrl && finalUrl.packetString) {
            const packetFilename = path.join(global.outputDir, 'packets', `request-packet-${urlLineNumber}.txt`);
            if (!fs.existsSync(path.join(global.outputDir, 'packets'))) {
                fs.mkdirSync(path.join(global.outputDir, 'packets'));
            }
            fs.writeFileSync(packetFilename, finalUrl.packetString);
            console.log(`Request packet saved to ${packetFilename}`);
        } else {
            console.log('Request packet not found for the given URL.');
        }
    };

    const startPlaywright = (hostname) => {
        worker = new Worker(__filename, { workerData: { hostname, outputDir } });

        worker.on('message', (message) => {
            if (message.type === 'save') {
                saveLogsToFile(hostname, message.urlLog, message.sinkLog, message.sourceMapLog);
            } else if (message.type === 'debug_stop') {
                console.log('Dangerous sink detected. Stopping application.');
                worker.terminate();
                process.exit(0);
            }
        });
    };

    const saveLogsToFile = (hostname, urlLog, sinkLog, sourceMapLog) => {
        const groupedUrls = groupUrls(urlLog);
        const finalUrls = calculateSimilarity(groupedUrls);
        let currentLength = 0;
        let currentContent = '';

        global.finalUrls = finalUrls;

        finalUrls.forEach((urlObj) => {
            const transformedUrl = urlObj.url.replace(new RegExp(hostname, 'g'), 'CTF');
            urlObj.transformedUrl = transformedUrl;
            if (currentLength + transformedUrl.length + 1 > global.maxLen) {
                currentContent += `\n\n`;
                currentLength = 0;
            }
            currentContent += `${transformedUrl}\n`;
            currentLength += transformedUrl.length + 1;
        });

        fs.writeFileSync(path.join(global.outputDir, 'urls.txt'), currentContent.trim(), 'utf8');
        console.log(`URLs have been saved to "urls.txt" in the "output" directory.`);

        if (sinkLog.length > 0) {
            const sinkContent = sinkLog.map(log => `Detected "${log.sink}" in script: ${log.scriptUrl}\n`).join('\n');
            fs.appendFileSync(path.join(global.outputDir, 'dangerous_sinks.txt'), sinkContent, 'utf8');
            console.log(`Dangerous sinks have been saved to "dangerous_sinks.txt" in the "output" directory.`);
        }

        if (sourceMapLog.length > 0) {
            const sourceMapContent = sourceMapLog.map(log => `Discovered source map for script: ${log.scriptUrl}\nSource map URL: ${log.sourceMapUrl}\n`).join('\n');
            fs.appendFileSync(path.join(global.outputDir, 'discovered_source_maps.txt'), sourceMapContent, 'utf8');
            console.log(`Source maps have been saved to "discovered_source_maps.txt" in the "output" directory.`);
        }
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

    global.requests = [];
    global.urlLog = [];
    global.sinkLog = [];
    global.sourceMapLog = [];
    global.maxLen = 10240;
    global.outputDir = outputDir;
    global.finalUrls = [];

} else {
    const { hostname, outputDir } = workerData;

    let urlLog = [];
    let requests = [];
    let sinkLog = [];
    let sourceMapLog = [];
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
            headless: false
        });

        const context = await browser.newContext({
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

        const page = await context.newPage();

        const sourceMapSchemes = [
            '{filename}.map',
            '{filename}.js.map',
            '{filename}.min.map',
            '{filename}.min.js.map',
            '{filename}-debug.map',
            '{filename}.bundle.map',
            '{filename}.bundle.js.map',
            '{filename}.bundle.min.map',
            '{filename}.bundle.min.js.map',
            '{filename}-dev.map',
            '{filename}-dev.js.map',
            '{filename}-prod.map',
            '{filename}.prod.map',
            '{filename}.prod.js.map',
            '{filename}.production.map',
            '{filename}.production.js.map',
            '{filename}.development.map',
            '{filename}.development.js.map',
            '{filename}.test.map',
            '{filename}.test.js.map'
        ];

        const isSourceMapAvailable = async (url) => {
            try {
                const response = await (await import('node-fetch')).default(url, { headers: { 'Cache-Control': 'no-cache' } });
                return response.ok;
            } catch (error) {
                console.error(`Error fetching source map at ${url}: ${error.message}`);
                return false;
            }
        };

        const fuzzSourceMapUrls = async (scriptUrl, schemes) => {
            const urlObj = new URL(scriptUrl);
            const filename = path.basename(urlObj.pathname, path.extname(urlObj.pathname));

            for (const scheme of schemes) {
                const sourceMapUrl = new URL(scheme.replace('{filename}', filename), scriptUrl).toString();
                if (await isSourceMapAvailable(sourceMapUrl)) {
                    sourceMapLog.push({ scriptUrl, sourceMapUrl });
                }
            }
        };

        const logSourceMap = (scriptUrl, sourceMapUrl) => {
            console.log(`Discovered source map for script: ${scriptUrl}\nSource map URL: ${sourceMapUrl}\n`);
            sourceMapLog.push({ scriptUrl, sourceMapUrl });
        };

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

                if (request.resourceType() === 'script') {
                    request.response().then(async response => {
                        const content = await response.text();
                        dangerousSinks.forEach(sink => {
                            if (content.includes(sink)) {
                                console.log(`Detected dangerous sink "${sink}" in ${request.url()}`);
                                sinkLog.push({ sink, scriptUrl: request.url() });
                            }
                        });

                        const sourceMappingUrlMatch = content.match(/\/\/# sourceMappingURL=([\w./-]+)/);
                        if (sourceMappingUrlMatch) {
                            const sourceMapUrl = new URL(sourceMappingUrlMatch[1], request.url()).toString();
                            if (await isSourceMapAvailable(sourceMapUrl)) {
                                logSourceMap(request.url(), sourceMapUrl);
                            } else {
                                console.log(`Source map not found for URL: ${sourceMapUrl}`);
                            }
                        } else {
                            await fuzzSourceMapUrls(request.url(), sourceMapSchemes);
                        }
                    }).catch(error => {
                        console.error(`Error reading script content for ${request.url()}: ${error.message}`);
                    });
                }
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
        browser.on('disconnected', () => {
            console.log('Browser closed.');
            console.log('Playwright finished its tasks.');
            parentPort.postMessage({ type: 'save', urlLog, requests, sinkLog, sourceMapLog, urlToRequestIndexMap }); // Send back the log and requests
        });

        parentPort.on('message', (message) => {
            if (message === 'save') {
                parentPort.postMessage({ type: 'save', urlLog, requests, sinkLog, sourceMapLog, urlToRequestIndexMap }); // Send back the log and requests
            }
        });

    };

    startPlaywright(workerData.hostname, workerData.outputDir).catch(err => console.error('Playwright error:', err));
}