const fs = require('fs');
const readline = require('readline-sync');
const stringSimilarity = require('string-similarity');
const { URL } = require('url');

// Prompt user for the URL list file path
const filePath = readline.question('Enter the path to the URLs list file: ');

// Read the contents of the file
fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading the file:', err);
        return;
    }

    // Split the file content into lines and create URL objects
    const urls = data.split('\n').map(url => ({ url: url.trim() })).filter(urlObj => urlObj.url);

    // Group URLs based on similarity
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

    // Calculate similarity and filter unique URLs
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

    // Group and filter URLs
    const groupedUrls = groupUrls(urls);
    const uniqueUrls = calculateSimilarity(groupedUrls);

    // Get the output file name
    const outputFileName = `${filePath.split('.').slice(0, -1).join('.')}_distinct.txt`;

    // Save the distinct list of URLs to the new file
    fs.writeFile(outputFileName, uniqueUrls.map(urlObj => urlObj.url).join('\n'), (err) => {
        if (err) {
            console.error('Error writing the file:', err);
        } else {
            console.log(`Distinct URLs saved to ${outputFileName}`);
        }
    });
});
