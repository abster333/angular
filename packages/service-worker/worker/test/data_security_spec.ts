/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {CacheDatabase} from '../src/db-cache';
import {Driver} from '../src/driver';
import {Manifest} from '../src/manifest';
import {MockRequest} from '../testing/fetch';
import {MockFileSystemBuilder, MockServerStateBuilder, tmpHashTableForFs} from '../testing/mock';
import {SwTestHarness, SwTestHarnessBuilder} from '../testing/scope';
import {envIsSupported} from '../testing/utils';

(function () {
  // Skip environments that don't support the minimum APIs needed to run the SW tests.
  if (!envIsSupported()) {
    return;
  }

  describe('data group security', () => {
    let scope: SwTestHarness;
    let driver: Driver;
    let dist: any;
    let manifest: Manifest;
    let server: any;

    beforeEach(async () => {
      dist = new MockFileSystemBuilder()
        .addFile('/api/sensitive', 'sensitive data', {'Cache-Control': 'no-store'})
        .build();
      
      manifest = {
        configVersion: 1,
        timestamp: 1234567890123,
        index: '/index.html',
        assetGroups: [],
        dataGroups: [
          {
            name: 'api',
            maxSize: 10,
            strategy: 'performance',
            patterns: ['^/api/.*$'],
            maxAge: 10000,
            version: 1,
          },
        ],
        navigationUrls: [],
        navigationRequestStrategy: 'performance',
        hashTable: tmpHashTableForFs(dist),
      };

      server = new MockServerStateBuilder()
        .withStaticFiles(dist)
        .withManifest(manifest)
        .build();

      scope = new SwTestHarnessBuilder().withServerState(server).build();
      driver = new Driver(scope, scope, new CacheDatabase(scope));
      await driver.initialized;
    });

    it('caches responses with Cache-Control: no-store', async () => {
      // First request: should hit the network and cache it
      expect(await makeRequest(scope, '/api/sensitive')).toEqual('sensitive data');
      server.assertSawRequestFor('/api/sensitive');

      // Update server content to verify we are serving from cache
      const distUpdate = new MockFileSystemBuilder()
        .addFile('/api/sensitive', 'new sensitive data', {'Cache-Control': 'no-store'})
        .build();
      
      const serverUpdate = new MockServerStateBuilder()
        .withStaticFiles(distUpdate)
        .withManifest(manifest)
        .build();
      
      scope.updateServerState(serverUpdate);
      serverUpdate.clearRequests();

      // Second request: should be served from cache (stale data) despite no-store
      expect(await makeRequest(scope, '/api/sensitive')).toEqual('sensitive data');
      serverUpdate.assertNoOtherRequests();
    });
  });
})();

function makeRequest(scope: SwTestHarness, url: string, clientId?: string): Promise<string | null> {
  const [resTextPromise, done] = makePendingRequest(scope, url, clientId);
  return done.then(() => resTextPromise);
}

function makePendingRequest(
  scope: SwTestHarness,
  urlOrReq: string | MockRequest,
  clientId?: string,
): [Promise<string | null>, Promise<void>] {
  const req = typeof urlOrReq === 'string' ? new MockRequest(urlOrReq) : urlOrReq;
  const [resPromise, done] = scope.handleFetch(req, clientId || 'default');
  return [resPromise.then<string | null>((res) => (res ? res.text() : null)), done];
}
