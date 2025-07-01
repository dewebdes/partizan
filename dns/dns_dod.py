import ipaddress
import dns.message
import dns.query
import dns.rdatatype
import random
import socket
import time
from datetime import datetime

def load_cidrs(file_path):
    with open(file_path, "r") as f:
        return [line.strip() for line in f if line.strip() and not line.startswith("#")]

def generate_all_ips(cidrs):
    all_ips = set()
    for cidr in cidrs:
        try:
            net = ipaddress.IPv4Network(cidr, strict=False)
            all_ips.update(str(ip) for ip in net.hosts())
        except Exception as e:
            print(f"⚠️ Skipping invalid CIDR {cidr}: {e}")
    return list(all_ips)

def test_dns_strict(ip, domain, decoy_domain):
    q = dns.message.make_query(domain, dns.rdatatype.A)
    q_fake = dns.message.make_query(decoy_domain, dns.rdatatype.A)
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.settimeout(1.5)
            s.sendto(q.to_wire(), (ip, 53))
            t0 = time.time()
            data, (responder_ip, _) = s.recvfrom(512)
            elapsed = round((time.time() - t0) * 1000, 2)

            if responder_ip != ip:
                return None  # spoofed or hijacked

            parsed = dns.message.from_wire(data)
            if not parsed.answer:
                return None

            # Honeycheck: Does it lie about the decoy?
            s.sendto(q_fake.to_wire(), (ip, 53))
            try:
                fake_data, (fake_ip, _) = s.recvfrom(512)
                if fake_ip == ip:
                    fake_resp = dns.message.from_wire(fake_data)
                    if fake_resp.answer:
                        return "poison"
            except socket.timeout:
                pass  # Expected (good!)

            return (ip, elapsed)

    except Exception:
        return None

def main():
    cidr_file = input("📂 Path to CIDR list file: ").strip()
    domain = input("🌐 Domain to test (e.g. example.com): ").strip()
    if not cidr_file or not domain:
        print("❌ Missing input. Exiting.")
        return

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    result_file = f"{domain.replace('.', '_')}_{timestamp}_verified.txt"
    poison_file = f"{domain.replace('.', '_')}_{timestamp}_poisoned.txt"
    decoy_domain = f"does-not-exist-{random.randint(10000,99999)}.dns"

    cidrs = load_cidrs(cidr_file)
    print(f"📦 Loaded {len(cidrs)} CIDRs")
    all_ips = generate_all_ips(cidrs)
    print(f"🎯 Scanning {len(all_ips)} IPs for direct DNS responders...\n")

    random.shuffle(all_ips)
    total = len(all_ips)
    count = 0

    for ip in all_ips:
        count += 1
        print(f"[{count}/{total}] Probing {ip}... ", end="", flush=True)
        result = test_dns_strict(ip, domain, decoy_domain)
        if isinstance(result, tuple):
            print(f"✅ {ip} responded in {result[1]} ms")
            with open(result_file, "a") as f:
                f.write(f"{result[0]},{result[1]} ms\n")
        elif result == "poison":
            print(f"⚠️ {ip} gave fake answers (spoofed)")
            with open(poison_file, "a") as f:
                f.write(f"{ip} — poisoned resolver\n")
        else:
            print("❌ no valid or direct response")

    print(f"\n🧾 Scan complete.")
    print(f"   ✓ Good results → {result_file}")
    print(f"   ⚠ Poisonous resolvers → {poison_file}")

if __name__ == "__main__":
    main()
