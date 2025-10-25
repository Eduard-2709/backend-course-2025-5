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

// Отримання шляху до файлу кешу
function getCacheFilePath(statusCode) {
    return path.join(options.cache, `${statusCode}.jpg`);
}

// Оновлений обробник GET запиту
async function handleGet(req, res, statusCode) {
    try {
        const filePath = getCacheFilePath(statusCode);
        const imageData = await fs.readFile(filePath);

        res.writeHead(200, {
            'Content-Type': 'image/jpeg',
            'Content-Length': imageData.length
        });
        res.end(imageData);
        console.log(`Відправлено кешовану картинку для статусу ${statusCode}`);
    } catch (error) {
        // Якщо картинки немає в кеші, робимо запит до http.cat
        console.log(`Картинки для статусу ${statusCode} немає в кеші, запитуємо з http.cat...`);
        await fetchFromHttpCat(req, res, statusCode);
    }
}

// Запит картинки з http.cat
async function fetchFromHttpCat(req, res, statusCode) {
    try {
        const response = await superagent
            .get(`https://http.cat/${statusCode}`)
            .responseType('blob');

        const imageData = response.body;

        // Зберігаємо в кеш
        const filePath = getCacheFilePath(statusCode);
        await fs.writeFile(filePath, imageData);

        // Відправляємо клієнту
        res.writeHead(200, {
            'Content-Type': 'image/jpeg',
            'Content-Length': imageData.length
        });
        res.end(imageData);

        console.log(`Картинку для статусу ${statusCode} отримано з http.cat та збережено в кеш`);
    } catch (error) {
        console.log(`Помилка отримання картинки для статусу ${statusCode} з http.cat:`, error.message);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
}

// Обробник PUT запиту
async function handlePut(req, res, statusCode) {
    const chunks = [];

    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
        try {
            const imageData = Buffer.concat(chunks);
            const filePath = getCacheFilePath(statusCode);

            await fs.writeFile(filePath, imageData);

            res.writeHead(201, { 'Content-Type': 'text/plain' });
            res.end('Created');
            console.log(`Картинку для статусу ${statusCode} збережено в кеш`);
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
        }
    });
}

// Обробник DELETE запиту
async function handleDelete(req, res, statusCode) {
    try {
        const filePath = getCacheFilePath(statusCode);
        await fs.unlink(filePath);

        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
        console.log(`Картинку для статусу ${statusCode} видалено з кешу`);
    } catch (error) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
}

// Основний обробник запитів
async function requestHandler(req, res) {
    const urlParts = req.url.split('/').filter(part => part !== '');
    const statusCode = urlParts[0];

    // Перевірка чи статус код є числом
    if (!statusCode || !/^\d+$/.test(statusCode)) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad Request');
        return;
    }

    console.log(`Запит: ${req.method} /${statusCode}`);

    switch (req.method) {
        case 'GET':
            await handleGet(req, res, statusCode);
            break;
        case 'PUT':
            await handlePut(req, res, statusCode);
            break;
        case 'DELETE':
            await handleDelete(req, res, statusCode);
            break;
        default:
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            res.end('Method Not Allowed');
    }
}

const server = http.createServer(requestHandler);

async function startServer() {
    await ensureCacheDir();

    server.listen(options.port, options.host, () => {
        console.log(`Проксі-сервер запущено на http://${options.host}:${options.port}`);
        console.log(`Директорія кешу: ${options.cache}`);
    });
}

startServer().catch(console.error);