const fs = require('fs');
const path = require('path');
const prompts = require('prompts');

async function processHosts() {
    const { parseDomain, fromUrl, ParseResultType } = await import('parse-domain');

    const response = await prompts({
        type: 'text',
        name: 'filePath',
        message: 'Please specify the path to the host list file:'
    });

    const filePath = response.filePath;

    // Read the host list file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const hosts = fileContent.split('\n').filter(line => line.trim() !== '');

    // Process the hosts
    const cleanHosts = new Set();
    hosts.forEach(host => {
        const originalHost = host.replace(/^www\./, '');  // Remove "www."
        const parsed = parseDomain(fromUrl(originalHost));
        if (parsed.type === ParseResultType.Listed) {
            const { domain, topLevelDomains } = parsed;
            if (domain) {
                cleanHosts.add(`${domain}.${topLevelDomains.join('.')}`);
            } else {
                cleanHosts.add(originalHost);  // Keep the original host if domain is null/undefined
            }
        } else {
            cleanHosts.add(originalHost);  // Keep the original host if parsing fails
        }
    });

    // Write the cleaned hosts to a new file
    const outputFilePath = path.join(path.dirname(filePath), 'cleaned_hosts.txt');
    fs.writeFileSync(outputFilePath, Array.from(cleanHosts).join('\n'), 'utf-8');

    console.log(`Cleaned host list saved to: ${outputFilePath}`);
}

processHosts().catch(console.error);
