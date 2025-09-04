Day 1 of Cyber, and This is How It's Going
​First day setting up my personal lab environment. Decided to go with Proxmox for virtualization. It's open-source and gives me a ton of control, which is exactly what I was looking for.
​Spinning up a few VMs to act as my playground:
​Kali Linux: The classic offensive security distro. It's pre-loaded with all the tools I'll need for reconnaissance, scanning, and exploitation exercises.
​Metasploitable 2: An intentionally vulnerable Linux VM. This will be my primary target for learning penetration testing techniques in a safe, controlled environment.
​Windows 10 Instance: A standard, un-patched Windows 10 VM to practice Windows-specific exploits and privilege escalation.
​pfSense Firewall: To segment my lab network from my home network. This is crucial for safety. I don't want any of my experiments accidentally bleeding over.
​The Plan
​The initial goal is simple: get everything talking to each other correctly on an isolated network. Once that's stable, I'll start with some basic network scanning using nmap from my Kali box to identify open ports and services on the Metasploitable machine.
