
import threading
from collections import Counter, deque
from datetime import datetime

from scapy.all import sniff, IP, IPv6, TCP, UDP, ICMP, DNS
from scapy.all import get_if_list


MAX_PACKETS = 500


class PacketAnalyzer:
    def __init__(self):
        self.lock = threading.Lock()
        self.stop_event = threading.Event()
        self.thread = None
        self.packets = deque(maxlen=MAX_PACKETS)
        self.protocol_counts = Counter()
        self.total_packets = 0
        self.total_bytes = 0
        self.running = False
        self.error = None
        self.interface = None

    def get_interfaces(self):
        try:
            return sorted(set(get_if_list()))
        except Exception:
            return []

    def get_protocol(self, packet):
        if TCP in packet:
            return "TCP"

        if UDP in packet:
            if DNS in packet or packet[UDP].sport == 53 or packet[UDP].dport == 53:
                return "DNS"
            return "UDP"

        if ICMP in packet:
            return "ICMP"

        if IPv6 in packet:
            return "IPv6"

        if IP in packet:
            return "IP"

        return "OTHER"

    def analyze_packet(self, packet):
        try:
            if IP in packet:
                source = packet[IP].src
                destination = packet[IP].dst
            elif IPv6 in packet:
                source = packet[IPv6].src
                destination = packet[IPv6].dst
            else:
                return

            protocol = self.get_protocol(packet)
            source_port = None
            destination_port = None

            if TCP in packet:
                source_port = int(packet[TCP].sport)
                destination_port = int(packet[TCP].dport)
            elif UDP in packet:
                source_port = int(packet[UDP].sport)
                destination_port = int(packet[UDP].dport)

            record = {
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "source": source,
                "destination": destination,
                "protocol": protocol,
                "source_port": source_port,
                "destination_port": destination_port,
                "size": len(packet),
                "ip_version": "IPv6" if IPv6 in packet else "IPv4",
            }

            with self.lock:
                self.total_packets += 1
                self.total_bytes += len(packet)
                self.protocol_counts[protocol] += 1
                self.packets.appendleft(record)

        except Exception:
            return

    def _capture_loop(self, interface):
        try:
            while not self.stop_event.is_set():
                sniff(
                    iface=interface,
                    prn=self.analyze_packet,
                    store=False,
                    timeout=1,
                )
        except Exception as exc:
            with self.lock:
                self.error = str(exc)
        finally:
            with self.lock:
                self.running = False

    def start_capture(self, interface):
        if not interface:
            return False, "Please select a network interface."

        with self.lock:
            if self.running:
                return False, "Capture is already running."

            self.error = None
            self.interface = interface
            self.stop_event.clear()
            self.running = True

            self.thread = threading.Thread(
                target=self._capture_loop,
                args=(interface,),
                daemon=True,
            )
            self.thread.start()

        return True, "Packet capture started."

    def stop_capture(self):
        self.stop_event.set()

        with self.lock:
            if not self.running:
                return True, "Packet capture is already stopped."

        return True, "Packet capture is stopping."

    def clear_packets(self):
        with self.lock:
            self.packets.clear()
            self.protocol_counts.clear()
            self.total_packets = 0
            self.total_bytes = 0

    def get_snapshot(self):
        with self.lock:
            return {
                "running": self.running,
                "interface": self.interface,
                "error": self.error,
                "total_packets": self.total_packets,
                "total_bytes": self.total_bytes,
                "protocol_counts": dict(self.protocol_counts),
                "packets": list(self.packets),
            }


analyzer = PacketAnalyzer()
