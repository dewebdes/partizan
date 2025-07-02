import ssl
import socket
import time

# ✅ Updated DoT hostnames (Android-compatible)
dot_servers = [
    "dns.google",
    "1dot1dot1dot1.cloudflare-dns.com",
    "dns.quad9.net",
    "dns.adguard-dns.com",
    "unfiltered.adguard-dns.com",
    "security-filter-dns.cleanbrowsing.org",
    "adult-filter-dns.cleanbrowsing.org",
    "family-filter-dns.cleanbrowsing.org",
    "freedns.controld.com",
    "dns.sb",
    "dns.opendns.com"
]

output_file = "dot_latency_sorted.txt"
results = []

def test_dot_latency(hostname):
    ctx = ssl.create_default_context()
    try:
        start = time.time()
        with socket.create_connection((hostname, 853), timeout=5) as sock:
            with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
                ssock.getpeercert()
                elapsed = round((time.time() - start) * 1000, 2)
                return elapsed
    except Exception:
        return None

print("🔍 Testing DoT resolvers...\n")

for server in dot_servers:
    print(f"⏳ {server}", end=" ... ")
    latency = test_dot_latency(server)
    if latency is not None:
        print(f"✅ {latency} ms")
        results.append((server, latency))
    else:
        print("❌ Unreachable or invalid")

# Sort by latency
results.sort(key=lambda x: x[1])

# Save to file
with open(output_file, "w") as f:
    for server, latency in results:
        f.write(f"{server},{latency} ms\n")

print(f"\n✅ Sorted results saved to: {output_file}")
