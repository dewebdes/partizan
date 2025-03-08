const fs = require('fs');
const xml2js = require('xml2js');
const prompt = require('prompt-sync')();
const path = require('path');

// Function to load and parse the XML file
async function loadBurpXML(filePath) {
    try {
        const xmlData = fs.readFileSync(filePath, 'utf8');
        const parser = new xml2js.Parser({ explicitArray: false });
        return await parser.parseStringPromise(xmlData);
    } catch (error) {
        console.error('Error reading or parsing the XML file:', error.message);
        process.exit(1);
    }
}

// Function to create a directory with a timestamp
function createOutputDirectory() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Format timestamp
    const outputDir = path.join('output', 'burp', timestamp);
    fs.mkdirSync(outputDir, { recursive: true }); // Create directories recursively
    return outputDir;
}

// Function to decode Base64 request/response content
function decodeBase64Field(base64Content) {
    if (!base64Content) return '';
    try {
        return Buffer.from(base64Content, 'base64').toString('utf8');
    } catch (error) {
        console.error('Error decoding Base64 content:', error.message);
        return '';
    }
}

// Function to save HTTP packets
function saveHttpPacket(item, outputDir, index) {
    const request = decodeBase64Field(item.request._);
    const response = item.response ? decodeBase64Field(item.response._) : null;

    // Save the HTTP request
    const requestFilePath = path.join(outputDir, `request_${index + 1}.txt`);
    fs.writeFileSync(requestFilePath, request, 'utf8');
    console.log(`Saved HTTP request to: ${requestFilePath}`);

    // Save the HTTP response, if available
    if (response) {
        const responseFilePath = path.join(outputDir, `response_${index + 1}.txt`);
        fs.writeFileSync(responseFilePath, response, 'utf8');
        console.log(`Saved HTTP response to: ${responseFilePath}`);
    }
}

// Function to log and save URLs in a single file
function saveUrlsList(urls, outputDir) {
    const urlsFilePath = path.join(outputDir, `urls.txt`);
    fs.writeFileSync(urlsFilePath, urls.join('\n'), 'utf8');
    console.log(`All matching URLs saved to: ${urlsFilePath}`);
}

// Function to search for URLs that contain the input URL
function searchByUrlContains(items, inputUrl, outputDir) {
    const results = items.filter(item => item.url && item.url.includes(inputUrl));
    if (results.length > 0) {
        console.log(`\nFound ${results.length} requests where URLs contain "${inputUrl}".`);

        const urls = []; // To store all matching URLs

        results.forEach((item, index) => {
            console.log(`\n[${index + 1}] URL: ${item.url}`); // Log the matched URL
            console.log(`Method: ${item.method}, Status: ${item.status}`);

            // Save URL to the list
            urls.push(item.url);

            // Save as HTTP packet
            saveHttpPacket(item, outputDir, index);
        });

        // Save all URLs to a file
        saveUrlsList(urls, outputDir);
    } else {
        console.log(`\nNo requests found with URLs containing "${inputUrl}".`);
    }
}

// Function to search for a keyword in requests/responses
function searchByKeyword(items, keyword, outputDir) {
    const urls = []; // To store matching URLs

    for (let item of items) {
        const decodedRequest = decodeBase64Field(item.request._);
        const decodedResponse = item.response ? decodeBase64Field(item.response._) : '';

        if (decodedRequest.includes(keyword) || decodedResponse.includes(keyword)) {
            console.log(`\nKeyword "${keyword}" found in this item:`);
            console.log(`URL: ${item.url}`);
            console.log(`Request:\n${decodedRequest}`);
            if (decodedResponse) {
                console.log(`Response:\n${decodedResponse}`);
            }

            // Save URL to the list
            urls.push(item.url);

            // Save as HTTP packet
            saveHttpPacket(item, outputDir, urls.length - 1);

            break; // Only save the first matching keyword item
        }
    }

    if (urls.length === 0) {
        console.log(`\nKeyword "${keyword}" not found in any requests or responses.`);
    } else {
        // Save the URL to a file
        saveUrlsList(urls, outputDir);
    }
}

// Main function
(async function main() {
    const filePath = prompt('Enter the path to the Burp Suite XML file: ');
    const burpData = await loadBurpXML(filePath);

    const items = burpData.items.item;
    if (!items || items.length === 0) {
        console.log('No items found in the XML file.');
        return;
    }

    const outputDir = createOutputDirectory(); // Create the output directory

    console.log('\nSearch Types:\n1. Search by URL\n2. Search by Keyword');
    const searchType = parseInt(prompt('Enter search type (1 for URL, 2 for Keyword): ').trim(), 10);

    if (searchType === 1) {
        const inputUrl = prompt('Enter the URL to search for: ').trim();
        searchByUrlContains(items, inputUrl, outputDir);
    } else if (searchType === 2) {
        const keyword = prompt('Enter the keyword to search for: ').trim();
        searchByKeyword(items, keyword, outputDir);
    } else {
        console.log('Invalid search type. Please enter 1 for URL or 2 for Keyword.');
    }

    console.log(`\nSearch completed. Check the results in the directory: ${outputDir}`);
})();
