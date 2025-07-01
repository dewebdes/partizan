import dns.message
import dns.rdatatype
import urllib.request
import socket
import time
import os
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import random

LIST_URL = "https://public-dns.info/nameservers.txt"
CACHE_FILE = "dns_cache.txt"

def fetch_dns_list():
    try:
        print("📥 Downloading DNS list...")
        response = urllib.request.urlopen(LIST_URL, timeout=10)
        content = response.read().decode()
        with open(CACHE_FILE, "w") as f:
            f.write(content)
        print(f"✅ DNS list saved to {CACHE_FILE}")
        return sorted(set(line.strip() for line in content.splitlines() if line.strip()))
    except Exception as e:
        print(f"⚠️ Failed to fetch DNS list: {e}")
        if os.path.exists(CACHE_FILE):
            print("📂 Using local cached DNS list instead.")
            with open(CACHE_FILE, "r") as f:
                return sorted(set(line.strip() for line in f if line.strip()))
        else:
            print("❌ No cached DNS list found. Exiting.")
            return []

def test_dns_verified(ip, domain, decoy_domain):
    try:
        q = dns.message.make_query(domain, dns.rdatatype.A)
        q_fake = dns.message.make_query(decoy_domain, dns.rdatatype.A)
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.settimeout(1.5)
            s.sendto(q.to_wire(), (ip, 53))
            t0 = time.time()
            data, addr = s.recvfrom(512)
            elapsed = round((time.time() - t0) * 1000, 2)
            if addr[0] != ip:
                return (ip, None, "spoofed")

            response = dns.message.from_wire(data)
            if not response.answer:
                return (ip, None, "empty")

            # Decoy test (poison detection)
            s.sendto(q_fake.to_wire(), (ip, 53))
            try:
                fake_data, fake_addr = s.recvfrom(512)
                if fake_addr[0] == ip:
                    fake_response = dns.message.from_wire(fake_data)
                    if fake_response.answer:
                        return (ip, None, "poisoned")
            except socket.timeout:
                pass

            return (ip, elapsed, "ok")
    except Exception:
        return (ip, None, "fail")

def run_scan(dns_list, domain):
    print(f"\n🚀 Scanning {len(dns_list)} DNS servers for verified responses...\n")
    results = []
    decoy_domain = f"not-a-host-{random.randint(10000,99999)}.dns"
    with ThreadPoolExecutor(max_workers=100) as executor:
        futures = {executor.submit(test_dns_verified, ip, domain, decoy_domain): ip for ip in dns_list}
        for future in as_completed(futures):
            ip, latency, status = future.result()
            if status == "ok":
                print(f"✅ {ip} → {latency} ms")
                results.append((ip, latency))
            elif status == "poisoned":
                print(f"⚠️ {ip} → responded to fake domain (poisoned)")
            elif status == "spoofed":
                print(f"❌ {ip} → response came from wrong IP (proxy/hijack)")
            elif status == "empty":
                print(f"✖️ {ip} → no answer in response")
            else:
                print(f"💤 {ip} → no reply")
    return sorted(results, key=lambda x: x[1])

def save_results(results, domain):
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    output_file = f"dns_verified_{domain.replace('.', '_')}_{timestamp}.txt"
    with open(output_file, "w") as f:
        for ip, latency in results:
            f.write(f"{ip},{latency} ms\n")
    print(f"\n📦 Saved {len(results)} verified DNS servers to {output_file}")

def main():
    domain = input("🔍 Enter domain to test (e.g. google.com): ").strip()
    if not domain:
        print("⚠️ No domain provided. Exiting.")
        return
    dns_list = fetch_dns_list()
    if not dns_list:
        return
    results = run_scan(dns_list, domain)
    save_results(results, domain)

if __name__ == "__main__":
    main()
