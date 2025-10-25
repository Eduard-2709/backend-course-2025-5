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

console.log('Проксі-сервер запускається...');
console.log('Налаштування:', options);