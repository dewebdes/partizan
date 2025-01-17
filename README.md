<p align="center">
  <img src="https://github.com/dewebdes/partizan/blob/main/image/logo.png" alt="Partizan Logo" width="100" height="100">
<br>
<strong align="center"># Partizan</strong>
</p>

**<u><b>Partizan</b></u>** refers to a member of an armed group formed to fight secretly against an occupying force, often associated with resistance movements and guerrilla warfare. The term has its roots in the **Parthian Empire**, a powerful ancient civilization known for its strategic resistance and formidable warriors. The word embodies the spirit of independence, resistance, and resourcefulness.

# Partizan

Partizan is a robust security tool designed to streamline the detection of dangerous sinks, key terms, and source maps in web applications. Built with efficiency and ease of use in mind, it leverages Playwright to provide comprehensive scanning capabilities. As part of our **NARROW-RECON** methodology, Partizan focuses on precise and targeted reconnaissance to enhance security measures.

## Features

- **Dangerous Sinks Detection**: Automatically identifies and logs potentially dangerous code snippets.
- **Key-Terms Detection**: Detects specified keywords in page dependencies and logs them separately.
- **Source Maps Discovery**: Discovers and logs source maps for further analysis.
- **WAF ASCII Filtering Detection**: Identifies filtered ASCII characters by fuzzing query parameters in web requests and checking different encoding methods if a character is filtered.
- **WAF Rule Detection**: Uses URL shortening to identify points where WAF rules/regex might block requests.
- **DOM XSS Detection**: Identifies DOM-based XSS vulnerabilities by testing URL parameters for reflection in the page content.
- **DDoS Testing**: Simulates Distributed Denial-of-Service (DDoS) attacks and monitors target's response time.
- **Comprehensive Logging**: Provides detailed logs of requests and responses.
- **Customizable Scans**: Easily configure and customize scans according to your needs.
- **Interested URLs List**: Generates a list of URLs of interest for detailed security checks.
- **Network Packet Analysis**: Logs, minimizes, and analyzes network packets to identify unique and potentially harmful requests.
- **SpiderFoot Data Fetching**: Fetches data from SpiderFoot scans and organizes it into distinct log files as part of our **WIDE-RECON** approach.
- **Screenshot Capture**: Captures screenshots of specified hosts and saves them for further analysis.
- **Host List Processing**: Cleans and processes host lists to remove subdomains and duplicates.

## Getting Started

### Prerequisites

- Node.js
- Playwright
- `node-fetch`
- `prompt-sync`
- `string-similarity`
- `axios`
- `readline`
- `fs`
- `worker_threads`
- `parse-domain`

### Installation

Clone the repository:

```bash
git clone https://github.com/dewebdes/partizan.git
cd partizan
```

Install dependencies:

```bash
npm install
```

### Usage

Follow the prompts to input the hostname or URL you want to analyze.

Run the `browser.cjs` script to perform dangerous sinks detection, key-terms detection, and source maps discovery:

```bash
node browser.cjs
```

Run the `packet-min.cjs` script for network packet analysis and minimization:

```bash
node packet-min.cjs
```

Run the `waf-ascii.cjs` script for WAF ASCII filtering detection:

```bash
node waf-ascii.cjs
```

Run the `checkUrl.cjs` script for WAF rule detection and URL shortening analysis:

```bash
node checkUrl.cjs
```

Run the `dom_xss_detector.cjs` script for DOM XSS detection:

```bash
node dom_xss_detector.cjs
```

Run the `ddos_tester.cjs` script for simulating DDoS attacks and monitoring target's response time:

```bash
node ddos_tester.cjs
```

Run the `fetchSpiderfootData.cjs` script to fetch data from SpiderFoot scans and organize them into distinct log files:

```bash
node fetchSpiderfootData.cjs
```

Run the `capture_screenshots.cjs` script to capture screenshots of specified hosts:

```bash
node capture_screenshots.cjs
```

Run the `process_hosts.cjs` script to clean and process host lists:

```bash
node process_hosts.cjs
```

### Customizing Browser Configuration

To customize the browser configuration for scripts that use Playwright, you can modify the `executablePath` to specify the path to the browser executable. This is useful if you want to use a specific browser installation, such as Google Chrome.

Here’s an example of how to set the `executablePath` in the Playwright launch options:

```javascript
const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Path to the browser executable
    headless: false, // Set to true if you want to run the browser in headless mode
    args: [
        '--no-sandbox',
        '--ignore-certificate-errors'
    ]
});
```

You can apply this configuration in any script that uses Playwright to launch a browser, such as `browser.cjs`, `capture_screenshots.cjs`, etc.

### DDoS Tester Customization

You can customize the `ddos_tester.cjs` script by modifying the payloads and other settings.

#### Customizing Payloads

To customize the payloads used in DDoS requests, you can edit the `payloads` array in the script:

```javascript
const payloads = [
    // Add your custom payloads here
];
```

You can add, modify, or remove payloads based on your specific requirements.

#### Customizing Request Settings

To customize the request settings, such as the number of workers, base delay, and ping delay, you can modify the following variables:

```javascript
const numWorkers = 30; // Number of worker threads
const baseDelay = 5000; // 5 seconds delay between requests
const pingDelay = 3 * 1000 * 5; // 15 seconds interval for ping requests
```

You can also configure the proxy settings to use different ports or hosts:

```javascript
const originalResponseTime = await captureResponseTime(testURL, { host: '192.168.189.131', port: 8080 });
const currentResponseTime = await captureResponseTime(`${testURL}&extra=${extraPayload}`, { host: '192.168.189.131', port: 8082 });
```

For detailed guidance on proxy configuration, including cloud worker base proxies, you can refer to this [proxy-guide](https://www.linkedin.com/posts/eyni-kave_aevagp-aewaeq-aetaevaezaetaepaeuaev-activity-7273419725672464384-Vs7e).

## File Descriptions

- **browser.cjs**: Handles the main browser automation tasks, including dangerous sink detection, key-terms detection, and source map discovery.
- **packet-min.cjs**: Focuses on processing and minimizing network packets for detailed analysis and security checks.
- **waf-ascii.cjs**: Detects filtered ASCII characters by fuzzing query parameters in web requests and checking different encoding methods if a character is filtered.
- **checkUrl.cjs**: Identifies points where WAF rules/regex might block requests by using URL shortening and detects points that return a 500 status or are dropped by the WAF.
- **dom_xss_detector.cjs**: Identifies DOM-based XSS vulnerabilities by testing URL parameters for reflection in the page content.
- **ddos_tester.cjs**: Simulates DDoS attacks and monitors target's response time, providing detailed logs and customizable payloads.
- **fetchSpiderfootData.cjs**: Fetches data from SpiderFoot scans, organizes it into distinct log files, and ensures unique entries in each file as part of the **WIDE-RECON** approach.
- **capture_screenshots.cjs**: Captures screenshots of specified hosts and saves them for further analysis.
- **process_hosts.cjs**: Cleans and processes host lists to remove subdomains and duplicates.

## Contributing

We welcome contributions to Partizan. Please read the [contributing guidelines](CONTRIBUTING.md) to get started.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Contributors**: Special thanks to all contributors who have made this project possible. Your dedication and hard work are greatly appreciated.
- **Community**: We extend our gratitude to the open-source community for their support and collaboration. Your feedback and contributions help improve this tool.
- **Inspiration**: This project is inspired by the relentless spirit of independence and resistance, embodied by the Parthian Empire and resistance movements throughout history.
- **Tools and Libraries**: We acknowledge the use of various open-source tools and libraries, including Playwright, node-fetch, prompt-sync, and string-similarity, which have been instrumental in the development of Partizan.

## Demo Videos 🛡️🚀✨

- For a comprehensive demo and walkthrough, watch our first video on YouTube: [Partizan Security Tool: Comprehensive Demo and Walkthrough](https://www.youtube.com/watch?v=HcKkYQ5fQf0).
- For the section where we get the URL list and more insights: [Partizan URL List Extraction](https://www.youtube.com/watch?v=i9bc1VABbHw).

<hr>
<a href="https://www.linkedin.com/posts/eyni-kave_web-hacking-via-copilot-ai-activity-7278260944256790530-lHp-">
<img src="https://github.com/dewebdes/partizan/blob/main/image/poster-3.jpg">
</a>
