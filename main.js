#!/usr/bin/env node

import { Command } from 'commander';
import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import superagent from 'superagent';

const program = new Command();

program
  .requiredOption('-h, --host <host>', 'адреса сервера')
  .requiredOption('-p, --port <port>', 'порт сервера')
  .requiredOption('-c, --cache <path>', 'шлях до директорії кешу');

program.parse(process.argv);
const options = program.opts();

// Створення директорії кешу, якщо вона не існує
async function ensureCacheDir() {
  try {
    await fs.access(options.cache);
  } catch (error) {
    console.log(`Створюємо директорію кешу: ${options.cache}`);
    await fs.mkdir(options.cache, { recursive: true });
  }
}

// Базовий HTTP сервер
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Проксі-сервер працює!\n');
});

async function startServer() {
  await ensureCacheDir();
  
  server.listen(options.port, options.host, () => {
    console.log(`Проксі-сервер запущено на http://${options.host}:${options.port}`);
    console.log(`Директорія кешу: ${options.cache}`);
  });
}

startServer().catch(console.error);