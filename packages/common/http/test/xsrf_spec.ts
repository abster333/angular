/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {MockPlatformLocation} from '@angular/common/testing';
import {DOCUMENT, PlatformLocation} from '../..';
import {HttpHeaders} from '../src/headers';
import {HttpRequest} from '../src/request';
import {
  HttpXsrfCookieExtractor,
  HttpXsrfInterceptor,
  HttpXsrfTokenExtractor,
  XSRF_ENABLED,
  XSRF_HEADER_NAME,
} from '../src/xsrf';
import {HttpClientTestingBackend} from '../testing/src/backend';
import {TestBed} from '@angular/core/testing';

class SampleTokenExtractor extends HttpXsrfTokenExtractor {
  constructor(private token: string | null) {
    super();
  }

  override getToken(): string | null {
    return this.token;
  }
}

describe('HttpXsrfInterceptor', () => {
  let backend: HttpClientTestingBackend;
  let interceptor: HttpXsrfInterceptor;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: HttpXsrfTokenExtractor,
          useValue: new SampleTokenExtractor('test'),
        },
        {
          provide: XSRF_HEADER_NAME,
          useValue: 'X-XSRF-TOKEN',
        },
        {
          provide: XSRF_ENABLED,
          useValue: true,
        },
        {
          provide: PlatformLocation,
          useFactory: () =>
            new MockPlatformLocation({
              startUrl: 'http://sub.example.com/',
            }),
        },
        HttpXsrfInterceptor,
      ],
    });

    interceptor = TestBed.inject(HttpXsrfInterceptor);
    backend = new HttpClientTestingBackend();
  });

  it('applies XSRF protection to outgoing requests', () => {
    interceptor.intercept(new HttpRequest('POST', '/test', {}), backend).subscribe();
    const req = backend.expectOne('/test');
    expect(req.request.headers.get('X-XSRF-TOKEN')).toEqual('test');
    req.flush({});
  });

  it('does not apply XSRF protection when request is a GET', () => {
    interceptor.intercept(new HttpRequest('GET', '/test'), backend).subscribe();
    const req = backend.expectOne('/test');
    expect(req.request.headers.has('X-XSRF-TOKEN')).toEqual(false);
    req.flush({});
  });

  it('does not apply XSRF protection when request is a HEAD', () => {
    interceptor.intercept(new HttpRequest('HEAD', '/test'), backend).subscribe();
    const req = backend.expectOne('/test');
    expect(req.request.headers.has('X-XSRF-TOKEN')).toEqual(false);
    req.flush({});
  });

  it('does not apply XSRF protection when request is absolute and cross-origin', () => {
    interceptor
      .intercept(new HttpRequest('POST', 'https://example.com/test', {}), backend)
      .subscribe();
    const req = backend.expectOne('https://example.com/test');
    expect(req.request.headers.has('X-XSRF-TOKEN')).toBeFalse();
    req.flush({});
  });

  it('does not apply XSRF protection when request is protocol relative and cross-origin', () => {
    interceptor.intercept(new HttpRequest('POST', '//example.com/test', {}), backend).subscribe();
    const req = backend.expectOne('//example.com/test');
    expect(req.request.headers.has('X-XSRF-TOKEN')).toBeFalse();
    req.flush({});
  });

  it('does apply XSRF protection when request is same-origin', () => {
    interceptor
      .intercept(new HttpRequest('POST', 'http://sub.example.com/test', {}), backend)
      .subscribe();
    const req = backend.expectOne('http://sub.example.com/test');
    expect(req.request.headers.has('X-XSRF-TOKEN')).toBeTrue();
    req.flush({});
  });

  it('does apply XSRF protection when request is protocol relative and same-origin', () => {
    interceptor
      .intercept(new HttpRequest('POST', '//sub.example.com/test', {}), backend)
      .subscribe();
    const req = backend.expectOne('//sub.example.com/test');
    expect(req.request.headers.has('X-XSRF-TOKEN')).toBeTrue();
    req.flush({});
  });

  it('does not overwrite existing header', () => {
    interceptor
      .intercept(
        new HttpRequest(
          'POST',
          '/test',
          {},
          {headers: new HttpHeaders().set('X-XSRF-TOKEN', 'blah')},
        ),
        backend,
      )
      .subscribe();
    const req = backend.expectOne('/test');
    expect(req.request.headers.get('X-XSRF-TOKEN')).toEqual('blah');
    req.flush({});
  });
  it('does not set the header for a null token', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: HttpXsrfTokenExtractor,
          useValue: new SampleTokenExtractor(null),
        },
        {
          provide: XSRF_HEADER_NAME,
          useValue: 'X-XSRF-TOKEN',
        },
        {
          provide: XSRF_ENABLED,
          useValue: true,
        },
        HttpXsrfInterceptor,
      ],
    });
    interceptor = TestBed.inject(HttpXsrfInterceptor);
    interceptor.intercept(new HttpRequest('POST', '/test', {}), backend).subscribe();
    const req = backend.expectOne('/test');
    expect(req.request.headers.has('X-XSRF-TOKEN')).toEqual(false);
    req.flush({});
  });
  afterEach(() => {
    backend.verify();
  });
});
describe('HttpXsrfCookieExtractor', () => {
  let document: {[key: string]: string};
  let extractor: HttpXsrfCookieExtractor;
  beforeEach(() => {
    document = {
      cookie: 'XSRF-TOKEN=test',
    };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DOCUMENT,
          useValue: document,
        },
      ],
    });
    extractor = TestBed.inject(HttpXsrfCookieExtractor);
  });
  it('parses the cookie from document.cookie', () => {
    expect(extractor.getToken()).toEqual('test');
  });
  it('does not re-parse if document.cookie has not changed', () => {
    expect(extractor.getToken()).toEqual('test');
    expect(extractor.getToken()).toEqual('test');
    expect(getParseCount(extractor)).toEqual(1);
  });
  it('re-parses if document.cookie changes', () => {
    expect(extractor.getToken()).toEqual('test');
    document['cookie'] = 'XSRF-TOKEN=blah';
    expect(extractor.getToken()).toEqual('blah');
    expect(getParseCount(extractor)).toEqual(2);
  });
});

function getParseCount(extractor: HttpXsrfCookieExtractor): number {
  return (extractor as any).parseCount;
}

/**
 * Security Test: XSRF Edge Cases
 *
 * These tests verify that the XSRF interceptor correctly handles edge cases
 * that could lead to token leakage to unintended origins.
 *
 * Related vulnerability: GHSA-58c5-g7wp-6w37 (Nov 2025) - Protocol-relative URL bypass
 */
describe('HttpXsrfInterceptor edge cases', () => {
  let backend: HttpClientTestingBackend;
  let interceptor: HttpXsrfInterceptor;

  function setupInterceptor(startUrl: string) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: HttpXsrfTokenExtractor,
          useValue: new SampleTokenExtractor('secret-token'),
        },
        {
          provide: XSRF_HEADER_NAME,
          useValue: 'X-XSRF-TOKEN',
        },
        {
          provide: XSRF_ENABLED,
          useValue: true,
        },
        {
          provide: PlatformLocation,
          useFactory: () => new MockPlatformLocation({startUrl}),
        },
        HttpXsrfInterceptor,
      ],
    });
    interceptor = TestBed.inject(HttpXsrfInterceptor);
    backend = new HttpClientTestingBackend();
  }

  afterEach(() => {
    backend.verify();
  });

  describe('port isolation', () => {
    it('should NOT add token for same host but different port', () => {
      setupInterceptor('http://example.com:80/');
      interceptor
        .intercept(new HttpRequest('POST', 'http://example.com:8080/api', {}), backend)
        .subscribe();
      const req = backend.expectOne('http://example.com:8080/api');
      expect(req.request.headers.has('X-XSRF-TOKEN')).toBeFalse();
      req.flush({});
    });

    it('should add token for same host and same port', () => {
      setupInterceptor('http://example.com:8080/');
      interceptor
        .intercept(new HttpRequest('POST', 'http://example.com:8080/api', {}), backend)
        .subscribe();
      const req = backend.expectOne('http://example.com:8080/api');
      expect(req.request.headers.has('X-XSRF-TOKEN')).toBeTrue();
      req.flush({});
    });

    it('should add token for same host with implicit default port (HTTP)', () => {
      setupInterceptor('http://example.com/');
      interceptor
        .intercept(new HttpRequest('POST', 'http://example.com:80/api', {}), backend)
        .subscribe();
      const req = backend.expectOne('http://example.com:80/api');
      // Both resolve to http://example.com (port 80 is default for HTTP)
      expect(req.request.headers.has('X-XSRF-TOKEN')).toBeTrue();
      req.flush({});
    });

    it('should add token for same host with implicit default port (HTTPS)', () => {
      setupInterceptor('https://example.com/');
      interceptor
        .intercept(new HttpRequest('POST', 'https://example.com:443/api', {}), backend)
        .subscribe();
      const req = backend.expectOne('https://example.com:443/api');
      // Both resolve to https://example.com (port 443 is default for HTTPS)
      expect(req.request.headers.has('X-XSRF-TOKEN')).toBeTrue();
      req.flush({});
    });
  });

  describe('subdomain isolation', () => {
    it('should NOT add token for different subdomain', () => {
      setupInterceptor('http://app.example.com/');
      interceptor
        .intercept(new HttpRequest('POST', 'http://api.example.com/data', {}), backend)
        .subscribe();
      const req = backend.expectOne('http://api.example.com/data');
      expect(req.request.headers.has('X-XSRF-TOKEN')).toBeFalse();
      req.flush({});
    });

    it('should NOT add token for parent domain', () => {
      setupInterceptor('http://sub.example.com/');
      interceptor
        .intercept(new HttpRequest('POST', 'http://example.com/data', {}), backend)
        .subscribe();
      const req = backend.expectOne('http://example.com/data');
      expect(req.request.headers.has('X-XSRF-TOKEN')).toBeFalse();
      req.flush({});
    });

    it('should NOT add token for child subdomain', () => {
      setupInterceptor('http://example.com/');
      interceptor
        .intercept(new HttpRequest('POST', 'http://sub.example.com/data', {}), backend)
        .subscribe();
      const req = backend.expectOne('http://sub.example.com/data');
      expect(req.request.headers.has('X-XSRF-TOKEN')).toBeFalse();
      req.flush({});
    });
  });

  describe('IPv6 addresses', () => {
    it('should add token for same IPv6 origin', () => {
      setupInterceptor('http://[::1]:3000/');
      interceptor
        .intercept(new HttpRequest('POST', 'http://[::1]:3000/api', {}), backend)
        .subscribe();
      const req = backend.expectOne('http://[::1]:3000/api');
      expect(req.request.headers.has('X-XSRF-TOKEN')).toBeTrue();
      req.flush({});
    });

    it('should NOT add token for different IPv6 address', () => {
      setupInterceptor('http://[::1]:3000/');
      interceptor
        .intercept(new HttpRequest('POST', 'http://[2001:db8::1]:3000/api', {}), backend)
        .subscribe();
      const req = backend.expectOne('http://[2001:db8::1]:3000/api');
      expect(req.request.headers.has('X-XSRF-TOKEN')).toBeFalse();
      req.flush({});
    });
  });

  describe('special URL schemes', () => {
    it('should NOT add token for data: URL', () => {
      setupInterceptor('http://example.com/');
      interceptor
        .intercept(new HttpRequest('POST', 'data:text/plain,hello', {}), backend)
        .subscribe();
      const req = backend.expectOne('data:text/plain,hello');
      // data: URLs have null origin, should not match
      expect(req.request.headers.has('X-XSRF-TOKEN')).toBeFalse();
      req.flush({});
    });

    it('should NOT add token for blob: URL with different origin', () => {
      setupInterceptor('http://example.com/');
      // blob: URLs inherit origin from creator, but if we parse a cross-origin blob URL
      // the origin would differ
      interceptor
        .intercept(new HttpRequest('POST', 'blob:http://other.com/uuid', {}), backend)
        .subscribe();
      const req = backend.expectOne('blob:http://other.com/uuid');
      expect(req.request.headers.has('X-XSRF-TOKEN')).toBeFalse();
      req.flush({});
    });
  });

  describe('malformed URLs', () => {
    it('should NOT add token for invalid URL (graceful handling)', () => {
      setupInterceptor('http://example.com/');
      // Invalid URL that would throw in new URL()
      interceptor
        .intercept(new HttpRequest('POST', '///:invalid', {}), backend)
        .subscribe();
      const req = backend.expectOne('///:invalid');
      // Should handle gracefully without throwing, token not added
      expect(req.request.headers.has('X-XSRF-TOKEN')).toBeFalse();
      req.flush({});
    });
  });

  describe('hostname case sensitivity', () => {
    it('should add token for same host with different case', () => {
      setupInterceptor('http://EXAMPLE.COM/');
      interceptor
        .intercept(new HttpRequest('POST', 'http://example.com/api', {}), backend)
        .subscribe();
      const req = backend.expectOne('http://example.com/api');
      // Hostnames are case-insensitive, URL parser normalizes to lowercase
      expect(req.request.headers.has('X-XSRF-TOKEN')).toBeTrue();
      req.flush({});
    });
  });

  describe('protocol mismatch', () => {
    it('should NOT add token for HTTP to HTTPS (different origin)', () => {
      setupInterceptor('http://example.com/');
      interceptor
        .intercept(new HttpRequest('POST', 'https://example.com/api', {}), backend)
        .subscribe();
      const req = backend.expectOne('https://example.com/api');
      // http://example.com !== https://example.com (different protocol = different origin)
      expect(req.request.headers.has('X-XSRF-TOKEN')).toBeFalse();
      req.flush({});
    });

    it('should NOT add token for HTTPS to HTTP (different origin)', () => {
      setupInterceptor('https://example.com/');
      interceptor
        .intercept(new HttpRequest('POST', 'http://example.com/api', {}), backend)
        .subscribe();
      const req = backend.expectOne('http://example.com/api');
      expect(req.request.headers.has('X-XSRF-TOKEN')).toBeFalse();
      req.flush({});
    });
  });
});
