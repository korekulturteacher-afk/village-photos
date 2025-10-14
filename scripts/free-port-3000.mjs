#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import os from 'node:os';

const DEFAULT_PORT = 3000;
const port = Number(process.env.PORT ?? DEFAULT_PORT);

if (Number.isNaN(port) || port <= 0) {
  console.error(`[port-guard] Invalid port "${process.env.PORT}".`);
  process.exit(1);
}

function uniqueNumbers(values) {
  return [...new Set(values.filter((value) => Number.isInteger(value) && value > 0))];
}

function parseWindowsPids() {
  const result = spawnSync('netstat', ['-ano'], { encoding: 'utf8' });
  if (result.error) {
    console.warn('[port-guard] Failed to execute "netstat".', result.error);
    return [];
  }

  const regex = new RegExp(`:${port}\\b`);
  const lines = result.stdout.split(/\r?\n/);
  const pids = lines
    .filter((line) => line.includes('LISTENING') && regex.test(line))
    .map((line) => {
      const parts = line.trim().split(/\s+/);
      const pid = Number(parts.at(-1));
      return Number.isNaN(pid) ? null : pid;
    })
    .filter((pid) => pid !== null);

  return uniqueNumbers(pids);
}

function parseUnixPids() {
  const result = spawnSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN'], {
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    return [];
  }

  const [, ...rows] = result.stdout.trim().split(/\r?\n/);
  const pids = rows
    .map((row) => {
      const parts = row.trim().split(/\s+/);
      return Number(parts[1]);
    })
    .filter((pid) => !Number.isNaN(pid));

  return uniqueNumbers(pids);
}

function killPid(pid) {
  try {
    process.kill(pid, 'SIGTERM');
    console.log(`[port-guard] Terminated process ${pid} listening on port ${port}.`);
  } catch (error) {
    if (error.code === 'ESRCH') {
      return;
    }

    console.warn(
      `[port-guard] Unable to terminate process ${pid} with SIGTERM. Attempting forced kill.`,
    );

    try {
      process.kill(pid, 'SIGKILL');
      console.log(`[port-guard] Force-killed process ${pid}.`);
    } catch (finalError) {
      console.error(`[port-guard] Failed to force-kill process ${pid}:`, finalError.message);
    }
  }
}

function main() {
  const pids =
    os.platform() === 'win32'
      ? parseWindowsPids()
      : parseUnixPids();

  if (pids.length === 0) {
    return;
  }

  pids.forEach(killPid);
}

main();
