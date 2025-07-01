import dns.resolver
import socket
import time
import platform

# List of global DNS resolvers to benchmark
dns_servers = {
    "Google": "8.8.8.8",
    "Cloudflare": "1.1.1.1",
    "Quad9": "9.9.9.9",
    "OpenDNS": "208.67.222.222",
    "AdGuard": "94.140.14.14"
}

test_domain = "example.com"

def benchmark_dns(server_ip):
    resolver = dns.resolver.Resolver()
    resolver.nameservers = [server_ip]
    start = time.time()
    try:
        resolver.resolve(test_domain)
        return round((time.time() - start) * 1000, 2)
    except Exception:
        return None

def detect_system_dns():
    return dns.resolver.Resolver().nameservers

def resolve_actual_dns():
    try:
        hostname = socket.gethostname()
        ip = socket.gethostbyname(hostname)
        return ip
    except Exception:
        return None

def trace_current_dns_server():
    resolver = dns.resolver.Resolver()
    try:
        answer = resolver.resolve(test_domain)
        return answer.response.nameserver  # May return None or a single NS IP
    except Exception:
        return None

def measure_default_dns_latency(domain="example.com"):
    resolver = dns.resolver.Resolver()
    start = time.time()
    try:
        resolver.resolve(domain)
        return round((time.time() - start) * 1000, 2)
    except Exception:
        return None

def main():
    print(f"🧠 OS: {platform.system()} {platform.release()}")
    print("\n🔍 Benchmarking DNS resolvers...\n")
    for name, ip in dns_servers.items():
        latency = benchmark_dns(ip)
        if latency:
            print(f"✅ {name} ({ip}): {latency} ms")
        else:
            print(f"❌ {name} ({ip}): No response")

    print("\n🧠 System-configured DNS servers:")
    for ip in detect_system_dns():
        print(f" - {ip}")

    print("\n📡 Hostname resolution check:")
    resolved_ip = resolve_actual_dns()
    print(f" - Resolved IP: {resolved_ip if resolved_ip else 'Failed'}")

    print("\n⏱️ Measuring latency via system DNS...")
    latency = measure_default_dns_latency()
    print(f" - System DNS latency for {test_domain}: {latency if latency else 'Failed'} ms")

    current_dns = trace_current_dns_server()
    print(f"\n🕵️ DNS server that responded: {current_dns if current_dns else 'Unavailable'}")

if __name__ == "__main__":
    main()
