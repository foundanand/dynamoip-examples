#!/usr/bin/env node
'use strict';

/**
 * One-time host setup for the local (Quick mode) example.
 *
 * What this does:
 *   1. Checks mkcert is installed — exits with install instructions if not.
 *   2. Runs `mkcert -install` — adds the mkcert CA to your system keychain
 *      so your browser trusts certificates issued by dynamoip.
 *   3. Writes CAROOT (the path to your mkcert CA files) to .env —
 *      Docker mounts this directory so dynamoip uses the same CA.
 *   4. Adds inventory.local and dashboard.local to /etc/hosts —
 *      so your browser resolves these names to 127.0.0.1.
 *
 * Run once before `docker compose up --build`. Safe to re-run.
 *
 * Requires:
 *   - mkcert installed (brew install mkcert on macOS)
 *   - sudo on macOS/Linux (to write /etc/hosts)
 *   - Admin on Windows (run terminal as Administrator)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ENV_EXAMPLE = path.join(__dirname, '.env.example');
const ENV_FILE    = path.join(__dirname, '.env');

const HOSTS_FILE = process.platform === 'win32'
  ? 'C:\\Windows\\System32\\drivers\\etc\\hosts'
  : '/etc/hosts';

const HOSTNAMES   = ['inventory.local', 'dashboard.local'];
const HOSTS_ENTRY = `127.0.0.1 ${HOSTNAMES.join(' ')}`;
const HOSTS_MARK  = '# added by dynamoip local setup';

// --- Step 1: Check mkcert is installed ---

function checkMkcert() {
  try {
    execSync('mkcert -version', { stdio: 'pipe' });
  } catch (_) {
    console.error('\nError: mkcert is not installed.\n');
    console.error('Install it first, then re-run this script:\n');
    console.error('  macOS:   brew install mkcert');
    console.error('  Linux:   https://github.com/FiloSottile/mkcert#linux');
    console.error('  Windows: choco install mkcert\n');
    process.exit(1);
  }
}

// --- Step 2: Install CA into system keychain ---

function installCA() {
  try {
    // On macOS this opens a Keychain password prompt in the GUI — no sudo needed.
    // On Linux it may need the script to be run with sudo.
    execSync('mkcert -install', { stdio: 'inherit' });
  } catch (_) {
    console.error('\nmkcert -install failed.');
    if (process.platform === 'linux') {
      console.error('On Linux, try running with sudo:');
      console.error('  sudo node setup-hosts.js\n');
    }
    process.exit(1);
  }
}

// --- Step 3: Write CAROOT to .env ---

function getCaRoot() {
  return execSync('mkcert -CAROOT', { stdio: 'pipe' }).toString().trim();
}

function writeEnv(caroot) {
  if (!fs.existsSync(ENV_FILE) && fs.existsSync(ENV_EXAMPLE)) {
    fs.copyFileSync(ENV_EXAMPLE, ENV_FILE);
    console.log('  Created .env from .env.example');
  }

  let content = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : '';

  // Docker Compose does not support spaces in .env volume paths even when quoted.
  // If CAROOT contains spaces (e.g. macOS "Application Support"), create a symlink
  // at .mkcert-ca (no spaces) and use that as the mount path instead.
  let mountPath = caroot;
  if (caroot.includes(' ')) {
    const symlink = path.join(__dirname, '.mkcert-ca');
    if (fs.existsSync(symlink)) fs.unlinkSync(symlink);
    fs.symlinkSync(caroot, symlink);
    mountPath = symlink;
    console.log(`  Created symlink: .mkcert-ca → ${caroot}`);
  }

  if (/^CAROOT=/m.test(content)) {
    content = content.replace(/^CAROOT=.*/m, `CAROOT=${mountPath}`);
  } else {
    content = content.trimEnd() + `\nCAROOT=${mountPath}\n`;
  }

  fs.writeFileSync(ENV_FILE, content);
  console.log(`  CAROOT=${mountPath}`);
}

// --- Step 4: Add .local hostnames to /etc/hosts ---

function updateHosts() {
  let content;
  try {
    content = fs.readFileSync(HOSTS_FILE, 'utf8');
  } catch (e) {
    console.error(`\nCould not read ${HOSTS_FILE}: ${e.message}\n`);
    process.exit(1);
  }

  // Already present — nothing to do.
  if (HOSTNAMES.every(h => content.includes(h))) {
    console.log(`  Already present in ${HOSTS_FILE} — skipped`);
    return;
  }

  const entry = `${HOSTS_ENTRY}  ${HOSTS_MARK}\n`;

  try {
    fs.appendFileSync(HOSTS_FILE, entry);
    console.log(`  Added: ${HOSTS_ENTRY}`);
  } catch (e) {
    if (e.code === 'EACCES') {
      console.error(`\nPermission denied writing to ${HOSTS_FILE}.`);
      if (process.platform === 'win32') {
        console.error('Run this script from a terminal opened as Administrator.\n');
      } else {
        console.error('Re-run with sudo:');
        console.error('  sudo node setup-hosts.js\n');
      }
      process.exit(1);
    }
    throw e;
  }
}

// --- Main ---

console.log('\n[1/3] Checking mkcert...');
checkMkcert();
console.log('      mkcert is installed');

console.log('\n[2/3] Installing mkcert CA into system keychain...');
installCA();

console.log('\n[3/3] Writing CAROOT to .env...');
const caroot = getCaRoot();
writeEnv(caroot);

console.log('\n[4/4] Adding .local hostnames to /etc/hosts...');
updateHosts();

console.log(`
Done! Host setup complete.

  CA location : ${caroot}
  Hostnames   : ${HOSTNAMES.join(', ')} → 127.0.0.1

Next step:
  docker compose up --build

On other devices on the same network, install the CA cert once:
  ${path.join(caroot, 'rootCA.crt')}
  (see README.md for per-platform instructions)
`);
