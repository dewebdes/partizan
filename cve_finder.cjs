// Import required modules
const axios = require('axios');
const cheerio = require('cheerio');
const prompt = require('prompt-sync')();
const fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Disable SSL restrictions

// Axios instance configured to use your MITM proxy
const axiosInstance = axios.create({
    proxy: {
        host: '127.0.0.1',
        port: 8082, // Proxy port
    },
    headers: { 'User-Agent': 'Mozilla/5.0' }, // Custom User-Agent header
    validateStatus: () => true, // Accept all HTTP status codes
});

// Step 1: Get the keyword from user input
const keyword = prompt('Enter the keyword to search for CVEs: ');
const searchUrl = `https://cve.mitre.org/cgi-bin/cvekey.cgi?keyword=${keyword}`;

(async () => {
    try {
        console.log(`[INFO] Starting CVE search for keyword: "${keyword}"`);
        console.log(`[INFO] Fetching CVE list from: ${searchUrl}`);

        // Step 2: Fetch CVE list page
        const response = await axiosInstance.get(searchUrl);
        console.log(`[DEBUG] HTTP GET Response Code: ${response.status}`);
        console.log(`[DEBUG] Fetched Data Length: ${response.data.length} bytes`);

        const $ = cheerio.load(response.data);
        const cveLinks = [];

        console.log(`[INFO] Extracting CVE links from the response...`);
        // Extract CVE links
        $('a').each((i, link) => {
            const href = $(link).attr('href');
            if (href && href.includes('/CVERecord?id=')) {
                const fullLink = `https://www.cve.org${href}`;
                cveLinks.push(fullLink);
                console.log(`[DEBUG] Found CVE Link: ${fullLink}`);
            }
        });

        console.log(`[INFO] Total CVE links found: ${cveLinks.length}`);

        const finalResults = [];
        // Step 3: Visit each CVE page and search for GitHub links
        for (const cveLink of cveLinks) {
            try {
                console.log(`[INFO] Fetching CVE details from: ${cveLink}`);
                const cveResponse = await axiosInstance.get(cveLink);
                console.log(`[DEBUG] HTTP GET Response Code for ${cveLink}: ${cveResponse.status}`);
                console.log(`[DEBUG] Fetched Data Length: ${cveResponse.data.length} bytes`);

                const $$ = cheerio.load(cveResponse.data);
                const pageContent = $$.text();

                if (pageContent.includes('github.com')) {
                    finalResults.push({ cveLink, containsGithub: true });
                    console.log(`[INFO] GitHub link found in: ${cveLink}`);
                } else {
                    console.log(`[INFO] No GitHub link found in: ${cveLink}`);
                }
            } catch (err) {
                console.error(`[ERROR] Error accessing CVE page: ${cveLink} - ${err.message}`);
            }
        }

        // Step 4: Save final log to a file
        const logFileName = `cve_results_${keyword}.json`;
        fs.writeFileSync(logFileName, JSON.stringify(finalResults, null, 2));
        console.log(`[INFO] Results saved to ${logFileName}`);
    } catch (err) {
        console.error('[ERROR] An error occurred:', err.message);
    }
})();
