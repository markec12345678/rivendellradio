# Rock 88.7 — Broadcast Integration Guide

## Overview

This guide covers integration with real-world broadcast hardware and software. Rock 88.7 is designed to be vendor-neutral and supports industry standards (AES67, SNMP, GPIO, RDS, DAB+, EBU R128).

## Supported Hardware (Tested / Compatible)

| Vendor | Device | Integration | Standard |
|---|---|---|---|
| Rivendell | RDXport | ✅ Primary (playout, schedule, carts) | REST/CGI |
| RVR | T60 Transmitter | ✅ SNMP polling + SET (power, mute) | SNMPv2c |
| Inovonics | 730 RDS Encoder | ✅ SNMP (PI/PS/PTY/RT), GPIO | SNMP, RS-232 |
| Omnia | 9 Audio Processor | ✅ SNMP (preset, bypass), hot-spare | SNMP |
| Lawo | V_pro8 | 🧩 AES67/ST 2110 (NMOS IS-04/05) | AES67, NMOS |
| Riedel | Bolero | 🧩 AES67 (interop mode) | AES67 |
| Tektronix | SPG8000A | 🧩 PTP Grandmaster | IEEE 1588 PTPv2 |
| Burk | ARC Plus | 🧩 SNMP bridge (via Plugin SDK) | SNMP |
| Telos | Zephyr/IP | 🧩 AES67 (codec) | AES67 |
| Wheatstone | Blade | 🧩 Livewire+ / AES67 | AES67 |

## Integration: Rivendell RDXport

Rivendell is the primary automation system. Rock 88.7 communicates via RDXport REST API.

### Configuration
```env
# .env
RIVENDELL_URL=http://192.168.1.100/rdxport.cgi
RIVENDELL_USERNAME=admin
RIVENDELL_PASSWORD=secret
```

### API Endpoints Used
- `ListCarts` — Library sync (tracks, carts, metadata)
- `ListLogs` — Schedule import
- `AddCart` / `RemoveCart` — Voice track insertion
- `RML` — Live assist commands (PLAY, STOP, SWITCH)
- `ListServices` — Station management

### RML (Rivendell Macro Language)
Rock 88.7 sends RML commands via WebSocket for real-time control:
```
PLAY 1 1000!      # Play cart 1000 on log 1
STOP 1!            # Stop all on log 1
SWITCH 1 2!        # Switch to log 2
```

## Integration: SNMP Devices

### RVR T60 Transmitter
```yaml
# SNMP config (in Rock 88.7)
device: FM Transmitter (RVR T60)
ip: 192.168.1.50
community: public
polling_interval: 30s
oids:
  forward_power: 1.3.6.1.4.1.7483.1.1.1.1.0
  reflected_power: 1.3.6.1.4.1.7483.1.1.1.2.0
  vswr: 1.3.6.1.4.1.7483.1.1.1.3.0
  temperature: 1.3.6.1.4.1.7483.1.1.1.5.0
  status: 1.3.6.1.4.1.7483.1.1.1.6.0
```

### Inovonics 730 RDS Encoder
```yaml
device: RDS Encoder (Inovonics 730)
ip: 192.168.1.51
community: public
oids:
  pilot_status: 1.3.6.1.4.1.15478.2.1.1.0
  rds_error: 1.3.6.1.4.1.15478.2.1.2.0
  ps_text: 1.3.6.1.4.1.15478.2.3.1.0
  rt_text: 1.3.6.1.4.1.15478.2.3.2.0
```

### SNMP Traps (Async)
Rock 88.7 listens for SNMP traps (UDP 162) via `snmptrapd` sidecar:
```bash
# /etc/snmp/snmptrapd.conf
authCommunity log,execute,net public
format2 %V\n% Agent Address: %A \n Hostname: %B \n Community: %C \n Uptime: %T \n Trap OID: %W \n Description: %W \n Variables: %v \n
traphandle default /usr/local/bin/rock887-trap-handler.sh
```

## Integration: AES67 / SMPTE ST 2110

### PTP (Precision Time Protocol)
All AES67 devices must be PTP-locked to the same grandmaster:
```ini
# /etc/ptp4l.conf (linuxptp)
[ens6f0]
transportSpecific 0x1
network_transport L2
delay_mechanism E2E
```

### NMOS Registration
Rock 88.7 acts as NMOS IS-04 registry + IS-05 connection manager:
```bash
# Start NMOS registry
docker run -d --name nmos-registry -p 8080:8080 rock887/nmos-registry
```

### Routing Audio (NMOS IS-05)
```bash
# Route Studio A → FM Transmitter
curl -X POST http://localhost:3000/api/v1/aes67 \
  -d '{"action":"route","senderId":"node-001","receiverId":"node-002"}'
```

## Integration: GPIO / GPI

GPIO lines are monitored for hardware events (mic switch, on-air button, silence sensor):

| Line | Direction | Purpose |
|---|---|---|
| GPIO 1 | Input | Studio ON-AIR button |
| GPIO 2 | Input | Console fader start |
| GPIO 3 | Input | Silence sensor alarm |
| GPIO 4 | Input | EAS decoder relay |
| GPIO 5 | Output | ON-AIR lamp (red) |
| GPIO 6 | Output | Automation bypass relay |
| GPIO 7 | Output | Backup transmitter switch |
| GPIO 8 | Output | Cooling fan control |

## Integration: Icecast2 / Streaming

```xml
<!-- /etc/icecast2/icecast.xml -->
<icecast>
  <listen-socket>
    <port>8000</port>
  </listen-socket>
  <mount>
    <mount-name>/stream</mount-name>          <!-- MP3 192k -->
    <mount-name>/stream-aac</mount-name>       <!-- AAC 128k -->
    <mount-name>/stream-mobile</mount-name>    <!-- AAC-HE 64k -->
    <mount-name>/stream-opus</mount-name>      <!-- Opus 96k -->
  </mount>
</icecast>
```

## Integration: EAS/CAP

### FEMA IPAWS-OPEN
```env
IPAWS_COG_ID=COG-ROCK887-001
IPAWS_USER_ID=rock887-eas
IPAWS_PASSWORD=********
```

### DASDEC-III / SAGE ENDEC
Connect via SNMP for hardware encoder/decoder integration:
```yaml
device: EAS Encoder (DASDEC-III)
ip: 192.168.1.60
oids:
  alert_received: 1.3.6.1.4.1.21588.1.1
  test_status: 1.3.6.1.4.1.21588.1.2
```
