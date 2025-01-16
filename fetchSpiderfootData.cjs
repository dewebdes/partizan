const fs = require('fs');
const axios = require('axios');
const readline = require('readline');
const path = require('path');

const eventTypes = [
    "ACCOUNT_EXTERNAL_OWNED", "ACCOUNT_EXTERNAL_OWNED_COMPROMISED", "ACCOUNT_EXTERNAL_USER_SHARED_COMPROMISED",
    "AFFILIATE_EMAILADDR", "AFFILIATE_INTERNET_NAME", "AFFILIATE_INTERNET_NAME_HIJACKABLE",
    "AFFILIATE_INTERNET_NAME_UNRESOLVED", "AFFILIATE_IPADDR", "AFFILIATE_IPV6_ADDRESS",
    "AFFILIATE_WEB_CONTENT", "AFFILIATE_DOMAIN_NAME", "AFFILIATE_DOMAIN_UNREGISTERED",
    "AFFILIATE_COMPANY_NAME", "AFFILIATE_DOMAIN_WHOIS", "AFFILIATE_DESCRIPTION_CATEGORY",
    "AFFILIATE_DESCRIPTION_ABSTRACT", "APPSTORE_ENTRY", "CLOUD_STORAGE_BUCKET",
    "CLOUD_STORAGE_BUCKET_OPEN", "COMPANY_NAME", "CREDIT_CARD_NUMBER", "BASE64_DATA",
    "BITCOIN_ADDRESS", "BITCOIN_BALANCE", "BGP_AS_OWNER", "BGP_AS_MEMBER", "BLACKLISTED_COHOST",
    "BLACKLISTED_INTERNET_NAME", "BLACKLISTED_AFFILIATE_INTERNET_NAME", "BLACKLISTED_IPADDR",
    "BLACKLISTED_AFFILIATE_IPADDR", "BLACKLISTED_SUBNET", "BLACKLISTED_NETBLOCK", "COUNTRY_NAME",
    "CO_HOSTED_SITE", "CO_HOSTED_SITE_DOMAIN", "CO_HOSTED_SITE_DOMAIN_WHOIS", "DARKNET_MENTION_URL",
    "DARKNET_MENTION_CONTENT", "DATE_HUMAN_DOB", "DEFACED_INTERNET_NAME", "DEFACED_IPADDR",
    "DEFACED_AFFILIATE_INTERNET_NAME", "DEFACED_COHOST", "DEFACED_AFFILIATE_IPADDR",
    "DESCRIPTION_CATEGORY", "DESCRIPTION_ABSTRACT", "DEVICE_TYPE", "DNS_TEXT", "DNS_SRV",
    "DNS_SPF", "DOMAIN_NAME", "DOMAIN_NAME_PARENT", "DOMAIN_REGISTRAR", "DOMAIN_WHOIS", "EMAILADDR",
    "EMAILADDR_COMPROMISED", "EMAILADDR_DELIVERABLE", "EMAILADDR_DISPOSABLE", "EMAILADDR_GENERIC",
    "EMAILADDR_UNDELIVERABLE", "ERROR_MESSAGE", "ETHEREUM_ADDRESS", "ETHEREUM_BALANCE", "GEOINFO",
    "HASH", "HASH_COMPROMISED", "HTTP_CODE", "HUMAN_NAME", "IBAN_NUMBER", "INTERESTING_FILE",
    "INTERESTING_FILE_HISTORIC", "JUNK_FILE", "INTERNAL_IP_ADDRESS", "INTERNET_NAME",
    "INTERNET_NAME_UNRESOLVED", "IP_ADDRESS", "IPV6_ADDRESS", "LEI", "JOB_TITLE", "LINKED_URL_INTERNAL",
    "LINKED_URL_EXTERNAL", "MALICIOUS_ASN", "MALICIOUS_BITCOIN_ADDRESS", "MALICIOUS_IPADDR",
    "MALICIOUS_COHOST", "MALICIOUS_EMAILADDR", "MALICIOUS_INTERNET_NAME", "MALICIOUS_AFFILIATE_INTERNET_NAME",
    "MALICIOUS_AFFILIATE_IPADDR", "MALICIOUS_NETBLOCK", "MALICIOUS_PHONE_NUMBER", "MALICIOUS_SUBNET",
    "NETBLOCK_OWNER", "NETBLOCKV6_OWNER", "NETBLOCK_MEMBER", "NETBLOCKV6_MEMBER", "NETBLOCK_WHOIS",
    "OPERATING_SYSTEM", "LEAKSITE_URL", "LEAKSITE_CONTENT", "PASSWORD_COMPROMISED", "PHONE_NUMBER",
    "PHONE_NUMBER_COMPROMISED", "PHONE_NUMBER_TYPE", "PHYSICAL_ADDRESS", "PHYSICAL_COORDINATES",
    "PGP_KEY", "PROXY_HOST", "PROVIDER_DNS", "PROVIDER_JAVASCRIPT", "PROVIDER_MAIL", "PROVIDER_HOSTING",
    "PROVIDER_TELCO", "PUBLIC_CODE_REPO", "RAW_RIR_DATA", "RAW_DNS_RECORDS", "RAW_FILE_META_DATA",
    "SEARCH_ENGINE_WEB_CONTENT", "SOCIAL_MEDIA", "SIMILAR_ACCOUNT_EXTERNAL", "SIMILARDOMAIN",
    "SIMILARDOMAIN_WHOIS", "SOFTWARE_USED", "SSL_CERTIFICATE_RAW", "SSL_CERTIFICATE_ISSUED",
    "SSL_CERTIFICATE_ISSUER", "SSL_CERTIFICATE_MISMATCH", "SSL_CERTIFICATE_EXPIRED", "SSL_CERTIFICATE_EXPIRING",
    "TARGET_WEB_CONTENT", "TARGET_WEB_CONTENT_TYPE", "TARGET_WEB_COOKIE", "TCP_PORT_OPEN",
    "TCP_PORT_OPEN_BANNER", "TOR_EXIT_NODE", "UDP_PORT_OPEN", "UDP_PORT_OPEN_INFO", "URL_ADBLOCKED_EXTERNAL",
    "URL_ADBLOCKED_INTERNAL", "URL_FORM", "URL_FLASH", "URL_JAVASCRIPT", "URL_WEB_FRAMEWORK",
    "URL_JAVA_APPLET", "URL_STATIC", "URL_PASSWORD", "URL_UPLOAD", "URL_FORM_HISTORIC", "URL_FLASH_HISTORIC",
    "URL_JAVASCRIPT_HISTORIC", "URL_WEB_FRAMEWORK_HISTORIC", "URL_JAVA_APPLET_HISTORIC", "URL_STATIC_HISTORIC",
    "URL_PASSWORD_HISTORIC", "URL_UPLOAD_HISTORIC", "USERNAME", "VPN_HOST", "VULNERABILITY_DISCLOSURE",
    "VULNERABILITY_CVE_CRITICAL", "VULNERABILITY_CVE_HIGH", "VULNERABILITY_CVE_MEDIUM", "VULNERABILITY_CVE_LOW",
    "VULNERABILITY_GENERAL", "WEB_ANALYTICS_ID", "WEBSERVER_BANNER", "WEBSERVER_HTTPHEADERS",
    "WEBSERVER_STRANGEHEADER", "WEBSERVER_TECHNOLOGY", "WIFI_ACCESS_POINT", "WIKIPEDIA_PAGE_EDIT"
];


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Enter the SpiderFoot server URL (e.g., http://192.168.189.136:5001/): ', (serverUrl) => {
    rl.question('Enter the scan ID: ', async (scanId) => {
        const outputDir = `output/spider-${scanId}`;

        // Remove the scan folder if it exists
        if (fs.existsSync(outputDir)) {
            fs.rmdirSync(outputDir, { recursive: true });
        }

        // Create the scan folder
        fs.mkdirSync(outputDir, { recursive: true });

        // Initialize arrays to store all detected domains, subdomains, and IPs
        const allDomains = new Set();
        const allSubdomains = new Set();
        const allIPs = new Set();

        for (const eventType of eventTypes) {
            try {
                const url = `${serverUrl}scaneventresults?id=${scanId}&eventType=${eventType}`;
                const response = await axios.get(url);

                // Use a Set to ensure uniqueness for each event type
                const dataElements = new Set(response.data.map(event => event[1]));

                if (dataElements.size > 0) {
                    // Save data elements to individual event type files
                    fs.writeFileSync(`${outputDir}/${eventType}.txt`, Array.from(dataElements).join('\n'), 'utf-8');
                    console.log(`Data for event type "${eventType}" saved.`);

                    // Add data elements to the corresponding sets
                    if ((eventType.includes("DOMAIN") || eventType.includes("INTERNET_NAME")) && !eventType.includes("WHOIS")) {
                        dataElements.forEach(element => allDomains.add(element));
                    } else if (eventType.includes("IPADDR") || eventType.includes("IP_ADDRESS")) {
                        dataElements.forEach(element => allIPs.add(element));
                    }
                } else {
                    console.log(`No data for event type "${eventType}".`);
                }
            } catch (error) {
                console.error(`Error fetching data for event type "${eventType}":`, error.message);
            }
        }

        // Save all detected domains and IPs to log files
        if (allDomains.size > 0) {
            fs.writeFileSync(`${outputDir}/all_domains.txt`, Array.from(allDomains).join('\n'), 'utf-8');
        }

        if (allIPs.size > 0) {
            fs.writeFileSync(`${outputDir}/all_ips.txt`, Array.from(allIPs).join('\n'), 'utf-8');
        }

        // Detect and save subdomains from all_domains.txt
        const domainLines = fs.readFileSync(`${outputDir}/all_domains.txt`, 'utf-8').split('\n').filter(Boolean);
        const updatedDomains = new Set();

        domainLines.forEach(domain => {
            const parts = domain.split('.');
            if (parts.length > 2) {
                allSubdomains.add(domain); // Add the full hostname as the subdomain
            } else {
                updatedDomains.add(domain);
            }
        });

        // Save distinct subdomains
        if (allSubdomains.size > 0) {
            fs.writeFileSync(`${outputDir}/all_subdomains.txt`, Array.from(allSubdomains).join('\n'), 'utf-8');
        }

        // Save updated domains (without subdomains) back to all_domains.txt
        if (updatedDomains.size > 0) {
            fs.writeFileSync(`${outputDir}/all_domains.txt`, Array.from(updatedDomains).join('\n'), 'utf-8');
        }

        // Filter and save only valid IPs to all_ips.txt
        const ipLines = fs.readFileSync(`${outputDir}/all_ips.txt`, 'utf-8').split('\n').filter(Boolean);
        const validIPs = ipLines.map(line => {
            const match = line.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
            return match ? match[0] : null;
        }).filter(ip => ip !== null);
        fs.writeFileSync(`${outputDir}/all_ips.txt`, validIPs.join('\n'), 'utf-8');

        // Filter and save only valid domains to all_domains.txt
        const validDomains = Array.from(updatedDomains).filter(domain => {
            const domainPattern = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            return domainPattern.test(domain);
        });
        fs.writeFileSync(`${outputDir}/all_domains.txt`, validDomains.join('\n'), 'utf-8');

        rl.close();
    });
});
