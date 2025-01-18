const fs = require('fs');
const { chromium } = require('playwright');
const path = require('path');
const prompts = require('prompts');

async function captureScreenshot(domain, browser, resolvedHosts) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const url = `http://${domain}`;

    try {
        console.log(`Navigating to: ${url}`);
        await page.goto(url, { waitUntil: 'load' });

        // Ensure the domain is treated as a string and trim any whitespace
        const sanitizedDomain = String(domain).trim();
        const filePath = path.join(__dirname, 'output', 'shots', `${sanitizedDomain}.png`);
        console.log(`Screenshot path: ${filePath}`);

        // Ensure the directory exists before saving the screenshot
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        console.log(`Taking screenshot for: ${domain}`);
        await page.screenshot({ path: filePath });
        console.log(`Captured screenshot for ${domain}`);

        // Add the domain to the resolved hosts list
        resolvedHosts.add(domain);
    } catch (error) {
        console.log(`Failed to capture screenshot for ${domain}: ${error.message}`);
    } finally {
        await page.close();
    }
}

async function main() {
    const response = await prompts({
        type: 'text',
        name: 'filePath',
        message: 'Please specify the path to the domain list file:'
    });

    const filePath = response.filePath;
    console.log(`File path specified: ${filePath}`);

    fs.mkdirSync(path.join(__dirname, 'output', 'shots'), { recursive: true });

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const domains = fileContent.split('\n').filter(line => line.trim() !== '');

    console.log(`Number of domains to be processed: ${domains.length}`);

    const resolvedHosts = new Set();

    console.log('Launching browser...');
    const browser = await chromium.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: true,
        args: [
            '--no-sandbox',
            '--ignore-certificate-errors'
        ]
    });
    console.log('Browser launched successfully');

    for (const domain of domains) {
        // Debug: Log the domain being processed
        console.log(`Processing domain: ${domain}`);
        await captureScreenshot(domain, browser, resolvedHosts);
        await new Promise(resolve => setTimeout(resolve, 12000));
    }

    await browser.close();
    console.log('Browser closed');

    // Write the resolved hosts to a new file
    const resolvedHostsFilePath = path.join(path.dirname(filePath), 'resolved_hosts.txt');
    fs.writeFileSync(resolvedHostsFilePath, Array.from(resolvedHosts).join('\n'), 'utf-8');
    console.log(`Resolved hosts list saved to: ${resolvedHostsFilePath}`);
}

main().catch(console.error);
