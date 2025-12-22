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
import {Component, destroyPlatform, NgModule, NgZone} from '@angular/core';
import {INITIAL_CONFIG, platformServer} from '@angular/platform-server';
import {bootstrapApplication} from '@angular/platform-browser';

(function () {
  if (getDOM().supportsDOMEvents) return; // NODE only

  describe('SSRF Security', () => {
    @Component({
      selector: 'app',
      template: `Works!`,
    })
    class SecurityTestApp {}

    beforeEach(() => {
      destroyPlatform();
    });

    afterEach(() => {
      destroyPlatform();
    });

    describe('INITIAL_CONFIG.url validation', () => {
      it('should reject internal IPv4 addresses (127.0.0.1)', async () => {
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
        }).toThrow();
      });

      it('should reject internal IPv4 addresses (10.x.x.x)', async () => {
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
        }).toThrow();
      });

      it('should reject internal IPv4 addresses (192.168.x.x)', async () => {
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
        }).toThrow();
      });

      it('should reject AWS metadata endpoint (169.254.169.254)', async () => {
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
        }).toThrow();
      });

      it('should reject localhost', async () => {
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
        }).toThrow();
      });

      it('should reject internal IPv6 address (::1)', async () => {
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
        }).toThrow();
      });

      it('should reject file:// protocol', async () => {
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
        }).toThrow();
      });

      it('should reject ftp:// protocol', async () => {
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
        }).toThrow();
      });

      it('should allow safe external URLs', async () => {
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
          SecurityTestApp,
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

    describe('HttpClient SSRF via relativeUrlsTransformerInterceptorFn', () => {
      @NgModule({
        imports: [HttpClientTestingModule],
        declarations: [SecurityTestApp],
        bootstrap: [SecurityTestApp],
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

      it('should not resolve relative URLs to internal IPs when INITIAL_CONFIG.url is internal', async () => {
        // This test checks if HttpClient requests during SSR can be tricked into
        // targeting internal services when the base URL is an internal IP
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

          // If the bug exists, this request would be sent to http://127.0.0.1:8080/api/data
          // which is an SSRF vulnerability
          const req = mock.expectOne((r) => r.url.includes('/api/data'));

          // The request should NOT be allowed to target internal IPs
          expect(req.url).not.toContain('127.0.0.1');
          expect(req.url).not.toContain('localhost');

          req.flush({data: 'test'});
        });

        platform.destroy();
      });

      it('should not allow HttpClient to access cloud metadata endpoints', async () => {
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

          // Should NOT allow access to AWS metadata service
          expect(req.url).not.toContain('169.254.169.254');

          req.flush({data: 'test'});
        });

        platform.destroy();
      });
    });
  });
})();
