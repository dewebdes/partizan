<p align="center">
  <img src="https://github.com/dewebdes/partizan/blob/main/image/logo.png" alt="Partizan Logo" width="100" height="100">
<br>
<strong align="center"># Partizan</strong>
</p>
**<u><b>Partizan</b></u>** refers to a member of an armed group formed to fight secretly against an occupying force, often associated with resistance movements and guerrilla warfare. The term has its roots in the **Parthian Empire**, a powerful ancient civilization known for its strategic resistance and formidable warriors. The word embodies the spirit of independence, resistance, and resourcefulness.

# Partizan

Partizan is a robust security tool designed to streamline the detection of dangerous sinks and source maps in web applications. Built with efficiency and ease of use in mind, it leverages Playwright to provide comprehensive scanning capabilities.

## Features

- **Dangerous Sinks Detection**: Automatically identifies and logs potentially dangerous code snippets.
- **Source Maps Discovery**: Discovers and logs source maps for further analysis.
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

Run the `browser.cjs` script:

```bash
node browser.cjs
```

Run the `packet-min.cjs` script:

```bash
node packet-min.cjs
```

Follow the prompts to input the hostname you want to analyze.

## File Descriptions

- **browser.cjs**: Handles the main browser automation tasks, including dangerous sink detection and source map discovery.
- **packet-min.cjs**: Focuses on processing and minimizing network packets for detailed analysis and security checks.

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

#### Core Functions:

1. **Log and Minimize Packets**: Captures network packets during browsing sessions, filters out duplicates, and focuses on unique requests.
2. **Detailed Packet Analysis**: Analyzes minimized packets for security threats and highlights suspicious patterns.
3. **Report Generation**: Creates a detailed report of analyzed packets, providing insights and recommendations.

## Contributing

We welcome contributions to Partizan. Please read the [contributing guidelines](CONTRIBUTING.md) to get started.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Special thanks to all contributors and the community for their support.
```

This updated `README.md` now accurately reflects the final `package.json` setup and dependencies.

Let me know if there are any additional adjustments or updates you need! 😊
