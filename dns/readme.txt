# Windows
Get-NetAdapter | Where-Object {$_.Status -eq "Up"}
Get-DnsClientServerAddress -InterfaceAlias "Wi-Fi"
Set-DnsClientServerAddress -InterfaceAlias "Wi-Fi" -ServerAddresses ("1.1.1.1","1.0.0.1")

# linux
sudo nano /etc/netplan/01-netcfg.yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: no
      addresses: [192.168.1.100/24]
      gateway4: 192.168.1.1
      nameservers:
        addresses: [1.1.1.1, 1.0.0.1]
sudo netplan apply
systemd-resolve --status | grep 'DNS Servers' -A2

# Android
nslookup 1.0.153.42
dig -x 1.0.153.42
openssl s_client -connect 1.0.153.42:853
#or use DoT dnses
Open Settings
Go to Network & Internet (or Connections on Samsung)
Tap Private DNS
Select Private DNS provider hostname
Enter a hostname like:
dns.google
or
Go to Settings > Wi-Fi
Long-press your connected network → Modify network
Tap Advanced options
Change IP settings to Static
Enter your preferred DNS in DNS 1 and DNS 2
Example: 1.1.1.1 and 1.0.0.1 (Cloudflare)
