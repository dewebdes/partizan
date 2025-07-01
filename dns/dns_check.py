import dns.resolver
import socket
import platform

def detect_dns_servers():
    try:
        resolver = dns.resolver.Resolver()
        dns_servers = resolver.nameservers
        print("🔍 Detected DNS servers:")
        for ip in dns_servers:
            print(f" - {ip}")
    except Exception as e:
        print(f"❌ Failed to detect DNS servers: {e}")

def detect_hostname_dns():
    try:
        hostname = socket.gethostname()
        ip = socket.gethostbyname(hostname)
        print(f"\n🖥️ Hostname: {hostname}")
        print(f"📡 Resolved IP: {ip}")
    except Exception as e:
        print(f"❌ Failed to resolve hostname: {e}")

def main():
    print(f"🧠 OS: {platform.system()} {platform.release()}")
    detect_dns_servers()
    detect_hostname_dns()

if __name__ == "__main__":
    main()
