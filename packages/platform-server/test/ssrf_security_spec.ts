/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import '@angular/compiler';

import {PlatformLocation, ɵgetDOM as getDOM} from '@angular/common';
import {HttpClient, HttpClientModule} from '@angular/common/http';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {Component, destroyPlatform, NgModule, NgModuleRef, NgZone} from '@angular/core';
import {INITIAL_CONFIG, platformServer, ServerModule} from '@angular/platform-server';
import {bootstrapApplication} from '@angular/platform-browser';

(function () {
  if (getDOM().supportsDOMEvents) return; // NODE only

  describe('SSRF Security', () => {
    @Component({
      selector: 'app',
      template: `Works!`,
      standalone: true,
    })
    class StandaloneSecurityTestApp {}

    @Component({
      selector: 'app',
      template: `Works!`,
      standalone: false,
    })
    class NgModuleSecurityTestApp {}

    beforeEach(() => {
      destroyPlatform();
    });

    afterEach(() => {
      destroyPlatform();
    });

    describe('INITIAL_CONFIG.url handling (current behavior)', () => {
      it('accepts internal IPv4 addresses (127.0.0.1)', async () => {
        expect(() => {
          platformServer([
            {
              provide: INITIAL_CONFIG,
              useValue: {
                document: '<app></app>',
                url: 'http://127.0.0.1/admin',
              },
            },
          ]);
        }).not.toThrow();
      });

      it('accepts internal IPv4 addresses (10.x.x.x)', async () => {
        expect(() => {
          platformServer([
            {
              provide: INITIAL_CONFIG,
              useValue: {
                document: '<app></app>',
                url: 'http://10.0.0.1/internal',
              },
            },
          ]);
        }).not.toThrow();
      });

      it('accepts internal IPv4 addresses (192.168.x.x)', async () => {
        expect(() => {
          platformServer([
            {
              provide: INITIAL_CONFIG,
              useValue: {
                document: '<app></app>',
                url: 'http://192.168.1.1/router',
              },
            },
          ]);
        }).not.toThrow();
      });

      it('accepts AWS metadata endpoint (169.254.169.254)', async () => {
        expect(() => {
          platformServer([
            {
              provide: INITIAL_CONFIG,
              useValue: {
                document: '<app></app>',
                url: 'http://169.254.169.254/latest/meta-data/',
              },
            },
          ]);
        }).not.toThrow();
      });

      it('accepts localhost', async () => {
        expect(() => {
          platformServer([
            {
              provide: INITIAL_CONFIG,
              useValue: {
                document: '<app></app>',
                url: 'http://localhost/admin',
              },
            },
          ]);
        }).not.toThrow();
      });

      it('accepts internal IPv6 address (::1)', async () => {
        expect(() => {
          platformServer([
            {
              provide: INITIAL_CONFIG,
              useValue: {
                document: '<app></app>',
                url: 'http://[::1]/admin',
              },
            },
          ]);
        }).not.toThrow();
      });

      it('accepts file:// protocol', async () => {
        expect(() => {
          platformServer([
            {
              provide: INITIAL_CONFIG,
              useValue: {
                document: '<app></app>',
                url: 'file:///etc/passwd',
              },
            },
          ]);
        }).not.toThrow();
      });

      it('accepts ftp:// protocol', async () => {
        expect(() => {
          platformServer([
            {
              provide: INITIAL_CONFIG,
              useValue: {
                document: '<app></app>',
                url: 'ftp://internal.server/file.txt',
              },
            },
          ]);
        }).not.toThrow();
      });

      it('accepts safe external URLs', async () => {
        const platform = platformServer([
          {
            provide: INITIAL_CONFIG,
            useValue: {
              document: '<app></app>',
              url: 'https://example.com/path',
            },
          },
        ]);

        const appRef = await bootstrapApplication(
          StandaloneSecurityTestApp,
          {
            providers: [
              {
                provide: INITIAL_CONFIG,
                useValue: {
                  document: '<app></app>',
                  url: 'https://example.com/path',
                },
              },
            ],
          },
          {platformRef: platform},
        );

        const location = appRef.injector.get(PlatformLocation);
        expect(location.hostname).toBe('example.com');
        expect(location.protocol).toBe('https:');
        platform.destroy();
      });
    });

    describe('HttpClient SSRF via relativeUrlsTransformerInterceptorFn (current behavior)', () => {
      @NgModule({
        imports: [ServerModule, HttpClientModule, HttpClientTestingModule],
        declarations: [NgModuleSecurityTestApp],
        bootstrap: [NgModuleSecurityTestApp],
      })
      class HttpTestModule {}

      let ref: NgModuleRef<HttpTestModule>;
      let mock: HttpTestingController;
      let http: HttpClient;

      afterEach(() => {
        if (mock) {
          mock.verify();
        }
      });

      it('resolves relative URLs to internal IPs when INITIAL_CONFIG.url is internal', async () => {
        const platform = platformServer([
          {
            provide: INITIAL_CONFIG,
            useValue: {
              document: '<app></app>',
              url: 'http://127.0.0.1:8080/app',
            },
          },
        ]);

        ref = await platform.bootstrapModule(HttpTestModule);
        mock = ref.injector.get(HttpTestingController);
        http = ref.injector.get(HttpClient);

        ref.injector.get(NgZone).run(() => {
          http.get('/api/data').subscribe();

          const req = mock.expectOne((r) => r.url.includes('/api/data'));

          // Current behavior: relative URL is resolved against the internal base.
          expect(req.request.url).toContain('127.0.0.1:8080');

          req.flush({data: 'test'});
        });

        platform.destroy();
      });

      it('resolves relative URLs to cloud metadata endpoints when base is internal', async () => {
        const platform = platformServer([
          {
            provide: INITIAL_CONFIG,
            useValue: {
              document: '<app></app>',
              url: 'http://169.254.169.254/app',
            },
          },
        ]);

        ref = await platform.bootstrapModule(HttpTestModule);
        mock = ref.injector.get(HttpTestingController);
        http = ref.injector.get(HttpClient);

        ref.injector.get(NgZone).run(() => {
          http.get('/latest/meta-data/').subscribe();

          const req = mock.expectOne((r) => r.url.includes('latest/meta-data'));

          // Current behavior: relative URL is resolved against the metadata IP.
          expect(req.request.url).toContain('169.254.169.254');

          req.flush({data: 'test'});
        });

        platform.destroy();
      });
    });
  });
})();
