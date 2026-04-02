#!/usr/bin/env node
'use strict';

/**
 * Detects your machine's LAN IP using the OS-native command,
 * then writes it (along with any existing .env.example values)
 * into .env so dynamoip inside Docker uses the correct address.
 *
 * Usage:
 *   node setup-env.js
 *
 * Supports: macOS, Linux, Windows
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ENV_EXAMPLE = path.join(__dirname, '.env.example');
const ENV_FILE    = path.join(__dirname, '.env');

// --- Detect LAN IP using OS-native command ---

function getLanIp() {
  const platform = process.platform;

  if (platform === 'darwin') {
    // macOS — try Wi-Fi (en0) first, then Ethernet (en1)
    for (const iface of ['en0', 'en1', 'en2']) {
      try {
        const ip = execSync(`ipconfig getifaddr ${iface}`, { stdio: 'pipe' }).toString().trim();
        if (ip) return ip;
      } catch (_) {}
    }
    throw new Error('Could not detect LAN IP on macOS. Are you connected to a network?');
  }

  if (platform === 'linux') {
    // Linux — hostname -I returns all IPs space-separated; take the first
    try {
      const ip = execSync('hostname -I', { stdio: 'pipe' }).toString().trim().split(/\s+/)[0];
      if (ip) return ip;
    } catch (_) {}
    throw new Error('Could not detect LAN IP on Linux. Are you connected to a network?');
  }

  if (platform === 'win32') {
    // Windows — PowerShell: pick the first DHCP-assigned IPv4 that isn't loopback
    try {
      const cmd = `powershell -NoProfile -Command "` +
        `(Get-NetIPAddress -AddressFamily IPv4 ` +
        `| Where-Object { $_.IPAddress -notmatch '^127\\.' -and $_.PrefixOrigin -eq 'Dhcp' } ` +
        `| Sort-Object InterfaceIndex ` +
        `| Select-Object -First 1).IPAddress"`;
      const ip = execSync(cmd, { stdio: 'pipe' }).toString().trim();
      if (ip) return ip;
    } catch (_) {}
    throw new Error('Could not detect LAN IP on Windows. Are you connected to a network?');
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

// --- Read existing .env or seed from .env.example ---

function readEnvLines(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8').split('\n');
}

function setEnvValue(lines, key, value) {
  const prefix = `${key}=`;
  const idx = lines.findIndex(l => l.startsWith(prefix) || l.startsWith(`# ${prefix}`) || l.trimStart().startsWith(`#${prefix}`));
  if (idx >= 0) {
    lines[idx] = `${key}=${value}`;
  } else {
    lines.push(`${key}=${value}`);
  }
  return lines;
}

// --- Main ---

let lanIp;
try {
  lanIp = getLanIp();
} catch (e) {
  console.error(`\nError: ${e.message}`);
  console.error('Set LAN_IP manually in .env:  LAN_IP=192.168.x.x\n');
  process.exit(1);
}

// Seed .env from .env.example if it doesn't exist yet
if (!fs.existsSync(ENV_FILE) && fs.existsSync(ENV_EXAMPLE)) {
  fs.copyFileSync(ENV_EXAMPLE, ENV_FILE);
  console.log('Created .env from .env.example');
}

let lines = readEnvLines(ENV_FILE);
lines = setEnvValue(lines, 'LAN_IP', lanIp);

fs.writeFileSync(ENV_FILE, lines.join('\n').trimEnd() + '\n');

console.log(`
OS       : ${os.type()} (${process.platform})
LAN IP   : ${lanIp}
Written  : .env  →  LAN_IP=${lanIp}

Next steps:
  1. Fill in CF_API_TOKEN and CF_EMAIL in .env
  2. docker compose up --build
`);
