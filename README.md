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
- **Comprehensive Logging**: Provides detailed logs of requests and responses.
- **Customizable Scans**: Easily configure and customize scans according to your needs.
- **Interested URLs List**: Generates a list of URLs of interest for detailed security checks.
- **Network Packet Analysis**: Logs, minimizes, and analyzes network packets to identify unique and potentially harmful requests.

## Getting Started

### Prerequisites

- Node.js
- Playwright
- `node-fetch`
- `prompt-sync`
- `string-similarity`

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

Follow the prompts to input the hostname or URL you want to analyze. As part of our **NARROW-RECON** approach, these scripts focus on pinpointing critical security vulnerabilities efficiently.

### Source Customization

You can customize the Partizan tool by setting specific paths and proxies. Here's how:

1. **Chrome Path**: To set the path for Chrome, use the following example:
   ```javascript
   const browser = await playwright.chromium.launch({
       executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
   });
   ```

2. **Proxy Configuration**: To configure a proxy, use the following example:
   ```javascript
   const browser = await playwright.chromium.launch({
       args: ['--proxy-server=http://192.168.189.131:8080']
   });
   ```

For detailed guidance on proxy configuration, including cloud worker base proxies, you can refer to this [proxy-guide](https://www.linkedin.com/posts/eyni-kave_aevagp-aewaeq-aetaevaezaetaepaeuaev-activity-7273419725672464384-Vs7e).

Feel free to modify these settings based on your specific requirements.

## File Descriptions

- **browser.cjs**: Handles the main browser automation tasks, including dangerous sink detection, key-terms detection, and source map discovery.
- **packet-min.cjs**: Focuses on processing and minimizing network packets for detailed analysis and security checks.
- **waf-ascii.cjs**: Detects filtered ASCII characters by fuzzing query parameters in web requests and checking different encoding methods if a character is filtered.
- **checkUrl.cjs**: Identifies points where WAF rules/regex might block requests by using URL shortening and detects points that return a 500 status or are dropped by the WAF.

### packet-min.cjs

`packet-min.cjs` is designed for in-depth network packet analysis, focusing on processing and minimizing network packets to identify unique and potentially harmful requests.

#### Key Features:

- **Packet Logging**: Logs all HTTP and HTTPS requests and responses, capturing packet details for analysis.
- **Packet Minimization**: Analyzes logged packets to filter out duplicates and irrelevant data.
- **Detailed Reporting**: Generates a detailed report of minimized packets, highlighting any suspicious activity.
- **Integration with browser.cjs**: Enhances the overall security analysis when used with `browser.cjs`.

#### Example Usage

```bash
node packet-min.cjs
```

### waf-ascii.cjs

`waf-ascii.cjs` is designed to detect filtered ASCII characters in web application firewalls (WAF) by fuzzing query parameters. It tests various encoding methods to identify which characters are filtered and logs detailed results.

#### Key Features:

- **Filtered ASCII Detection**: Identifies which ASCII characters are filtered by the WAF.
- **Encoding Tests**: Checks URL encoding, double URL encoding, and HTML encoding if a character is filtered.
- **Detailed Reporting**: Provides a detailed CSV report of filtered characters and their encoding results.

#### Example Usage

```bash
node waf-ascii.cjs
```

### checkUrl.cjs

`checkUrl.cjs` is designed to identify points where WAF rules or regex might block requests by using URL shortening. It helps in detecting URLs that return a 500 status or are dropped by the WAF.

#### Key Features:

- **WAF Rule Detection**: Shortens the URL incrementally to identify points where WAF rules or regex might block requests.
- **HTTP Status Detection**: Detects URLs that return a 500 status or are dropped by the WAF.
- **Detailed Reporting**: Logs the results for further analysis.

#### Example Usage

```bash
node checkUrl.cjs
```

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
