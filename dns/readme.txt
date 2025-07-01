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
