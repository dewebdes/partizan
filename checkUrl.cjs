const { chromium } = require('playwright');

(async () => {
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    readline.question('Enter the URL: ', async (url) => {
        const browser = await chromium.launch({
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

        let response;
        while (url.length > 0) {
            try {
                response = await page.goto(url, { waitUntil: 'load', timeout: 5000 });
                if (response.status() === 200) {
                    console.log(`Success! 200 OK for URL: ${url}`);
                    break;
                } else {
                    console.log(`Received status ${response.status()} for URL: ${url}`);
                }
            } catch (e) {
                console.log(`Error loading URL: ${url}`);
            }
            url = url.slice(0, -1); // Remove the last character

            // Delay between requests
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            await delay(1000); // 1 second delay between requests
        }

        if (url.length === 0) {
            console.log('No valid URL found that returns a 200 response.');
        }

        await browser.close();
        readline.close();
    });
})();
