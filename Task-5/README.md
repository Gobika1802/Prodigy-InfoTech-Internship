
# Network Packet Analyzer

## About the Project

Network Packet Analyzer is a Python-based network monitoring application built using Flask and Scapy. It captures and analyzes network packets and displays useful traffic information through a web dashboard.

## Features

- Live network packet capture
- Network interface selection
- Packet details including source IP, destination IP, protocol, ports, and packet size
- Total packet and data statistics
- Protocol distribution dashboard
- Protocol-based packet filtering
- Start and stop capture controls
- Clear packet statistics
- Responsive dashboard design

## Technologies Used

- Python
- Flask
- Scapy
- HTML
- CSS
- JavaScript
- Npcap

## Project Structure

```text
Network Packet Analyzer/
├── app.py
├── packet_analyzer.py
├── requirements.txt
├── README.md
├── templates/
│   └── index.html
└── static/
    ├── style.css
    └── script.js
```

## Installation and Setup

### 1. Install Python

Install Python on your computer if it is not already installed.

### 2. Install Npcap

Install Npcap on Windows to enable packet capture. Follow its official installation instructions.

### 3. Create a Virtual Environment

```bash
python -m venv .venv
```

### 4. Activate the Virtual Environment

For Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

### 5. Install Dependencies

```bash
python -m pip install -r requirements.txt
```

## How to Run

1. Open the project folder in your terminal.
2. Activate the virtual environment.
3. Run the application:

```bash
python app.py
```

4. Open your browser and visit:

```text
http://127.0.0.1:5000
```

5. Select a network interface from the dashboard.
6. Click **Start Capture** to begin monitoring.
7. Use the protocol filter to inspect specific packet types.
8. Click **Stop Capture** to stop monitoring.

## Security and Privacy

- Use this application only on networks and devices you own or have explicit permission to monitor.
- Packet capture may require administrator privileges on Windows.
- Captured packet information is kept in application memory and is not saved to a database by this project.
- This application is intended for educational and authorized network troubleshooting purposes.

## Learning Objectives

- Understand basic network packet analysis.
- Explore common protocols such as TCP, UDP, DNS, and ICMP.
- Learn how to use Scapy for packet capture.
- Build a web dashboard using Flask.
- Display live statistics using JavaScript and API endpoints.

## Disclaimer

This project is intended for educational purposes. Always follow applicable laws, network policies, and privacy requirements when analyzing network traffic.
