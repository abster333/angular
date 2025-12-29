/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  Component,
  InjectionToken,
  inject,
  OnInit,
  Provider,
} from '@angular/core';
import {bootstrapApplication, BootstrapContext} from '@angular/platform-browser';
import {provideServerRendering} from '../public_api';
import {renderApplication} from '../src/utils';
import {DEFAULT_DOCUMENT} from './hydration_utils';

/**
 * Security Test: SSR Cross-Request Data Isolation
 *
 * These tests verify that concurrent SSR requests don't leak data between each other.
 * This is critical for multi-tenant applications where different users' data must be isolated.
 *
 * Related vulnerability: GHSA-68x2-mx4q-78m7 (Sep 2025) - SSR race conditions
 *
 * Attack scenario:
 * 1. Request A (user: alice) starts rendering component
 * 2. Request A hits async boundary (await/Promise)
 * 3. Request B (user: bob) starts rendering same component type
 * 4. Request B's context overwrites global instructionState
 * 5. Request A resumes using Request B's context
 * 6. Alice sees Bob's data in rendered HTML
 */
describe('SSR Cross-Request Data Isolation', () => {
  // Injection token for user-specific data (simulates session/auth data)
  const USER_ID = new InjectionToken<string>('USER_ID');
  const SESSION_TOKEN = new InjectionToken<string>('SESSION_TOKEN');

  beforeEach(() => {
    // Ensure clean state before each test
    globalThis['ngServerMode'] = true;
  });

  afterEach(() => {
    globalThis['ngServerMode'] = undefined;
  });

  /**
   * Helper to render a component with user-specific providers
   */
  async function renderWithUser(
    component: any,
    userId: string,
    sessionToken: string,
    extraProviders: Provider[] = [],
  ): Promise<string> {
    const providers = [
      provideServerRendering(),
      {provide: USER_ID, useValue: userId},
      {provide: SESSION_TOKEN, useValue: sessionToken},
      ...extraProviders,
    ];

    const bootstrap = (context: BootstrapContext) =>
      bootstrapApplication(component, {providers}, context);

    return renderApplication(bootstrap, {
      document: DEFAULT_DOCUMENT,
    });
  }

  describe('synchronous rendering', () => {
    it('should isolate user data between sequential SSR requests', async () => {
      @Component({
        selector: 'app',
        template: `<div class="user-id">{{userId}}</div><div class="session">{{session}}</div>`,
      })
      class UserComponent {
        userId = inject(USER_ID);
        session = inject(SESSION_TOKEN);
      }

      // Sequential requests - baseline test
      const htmlAlice = await renderWithUser(UserComponent, 'alice', 'session-alice-123');
      const htmlBob = await renderWithUser(UserComponent, 'bob', 'session-bob-456');

      // Verify Alice's data
      expect(htmlAlice).toContain('alice');
      expect(htmlAlice).toContain('session-alice-123');
      expect(htmlAlice).not.toContain('bob');
      expect(htmlAlice).not.toContain('session-bob-456');

      // Verify Bob's data
      expect(htmlBob).toContain('bob');
      expect(htmlBob).toContain('session-bob-456');
      expect(htmlBob).not.toContain('alice');
      expect(htmlBob).not.toContain('session-alice-123');
    });
  });

  describe('concurrent rendering', () => {
    it('should isolate user data between concurrent SSR requests', async () => {
      @Component({
        selector: 'app',
        template: `<div class="user-id">{{userId}}</div><div class="session">{{session}}</div>`,
      })
      class UserComponent {
        userId = inject(USER_ID);
        session = inject(SESSION_TOKEN);
      }

      // Concurrent requests - potential race condition
      const [htmlAlice, htmlBob] = await Promise.all([
        renderWithUser(UserComponent, 'alice', 'session-alice-123'),
        renderWithUser(UserComponent, 'bob', 'session-bob-456'),
      ]);

      // CRITICAL: Verify Alice's HTML doesn't contain Bob's data
      expect(htmlAlice).toContain('alice');
      expect(htmlAlice).toContain('session-alice-123');
      expect(htmlAlice).not.toContain('bob');
      expect(htmlAlice).not.toContain('session-bob-456');

      // CRITICAL: Verify Bob's HTML doesn't contain Alice's data
      expect(htmlBob).toContain('bob');
      expect(htmlBob).toContain('session-bob-456');
      expect(htmlBob).not.toContain('alice');
      expect(htmlBob).not.toContain('session-alice-123');
    });

    it('should isolate data with async component initialization', async () => {
      @Component({
        selector: 'app',
        template: `<div class="user-id">{{userId}}</div><div class="loaded">{{loaded}}</div>`,
      })
      class AsyncUserComponent implements OnInit {
        userId = inject(USER_ID);
        loaded = 'no';

        async ngOnInit() {
          // Force async boundary - this is where race conditions can occur
          await new Promise((resolve) => setTimeout(resolve, 10));
          this.loaded = 'yes';
        }
      }

      // Concurrent requests with async initialization
      const [htmlAlice, htmlBob] = await Promise.all([
        renderWithUser(AsyncUserComponent, 'alice', 'session-alice-123'),
        renderWithUser(AsyncUserComponent, 'bob', 'session-bob-456'),
      ]);

      // Verify data isolation even with async boundaries
      expect(htmlAlice).toContain('alice');
      expect(htmlAlice).not.toContain('bob');

      expect(htmlBob).toContain('bob');
      expect(htmlBob).not.toContain('alice');
    });

    it('should isolate data with multiple concurrent requests', async () => {
      @Component({
        selector: 'app',
        template: `<div class="user">{{userId}}</div>`,
      })
      class SimpleUserComponent {
        userId = inject(USER_ID);
      }

      // Many concurrent requests - higher chance of race conditions
      const users = ['alice', 'bob', 'charlie', 'david', 'eve'];
      const promises = users.map((user) =>
        renderWithUser(SimpleUserComponent, user, `session-${user}`),
      );

      const results = await Promise.all(promises);

      // Verify each user's HTML contains only their data
      results.forEach((html, index) => {
        const expectedUser = users[index];

        // Must contain expected user
        expect(html).toContain(expectedUser);

        // Must NOT contain any other user's data
        users.forEach((otherUser) => {
          if (otherUser !== expectedUser) {
            expect(html).not.toContain(otherUser);
          }
        });
      });
    });

    it('should isolate data with staggered async completion', async () => {
      const DELAY = new InjectionToken<number>('DELAY');

      @Component({
        selector: 'app',
        template: `<div class="user">{{userId}}</div><div class="status">{{status}}</div>`,
      })
      class StaggeredAsyncComponent implements OnInit {
        userId = inject(USER_ID);
        delay = inject(DELAY);
        status = 'pending';

        async ngOnInit() {
          // Different delays for different users to create interleaving
          await new Promise((resolve) => setTimeout(resolve, this.delay));
          this.status = 'complete';
        }
      }

      // Stagger completion times to maximize chance of interleaving
      const [htmlAlice, htmlBob] = await Promise.all([
        renderWithUser(StaggeredAsyncComponent, 'alice', 'session-alice', [
          {provide: DELAY, useValue: 20}, // Alice takes longer
        ]),
        renderWithUser(StaggeredAsyncComponent, 'bob', 'session-bob', [
          {provide: DELAY, useValue: 5}, // Bob finishes first
        ]),
      ]);

      // Despite interleaved completion, data must be isolated
      expect(htmlAlice).toContain('alice');
      expect(htmlAlice).not.toContain('bob');

      expect(htmlBob).toContain('bob');
      expect(htmlBob).not.toContain('alice');
    });
  });

  describe('global document isolation', () => {
    it('should not share DOM between concurrent SSR requests', async () => {
      // This test verifies that the global DOCUMENT variable
      // (packages/core/src/render3/interfaces/document.ts:27)
      // doesn't cause DOM nodes to be written to the wrong document

      const REQUEST_ID = new InjectionToken<string>('REQUEST_ID');

      @Component({
        selector: 'app',
        template: `<div class="marker" [attr.data-request]="requestId">Request: {{requestId}}</div>`,
      })
      class MarkerComponent {
        requestId = inject(REQUEST_ID);
      }

      const renderWithRequestId = (requestId: string): Promise<string> => {
        const providers = [
          provideServerRendering(),
          {provide: REQUEST_ID, useValue: requestId},
        ];

        const bootstrap = (context: BootstrapContext) =>
          bootstrapApplication(MarkerComponent, {providers}, context);

        return renderApplication(bootstrap, {
          document: DEFAULT_DOCUMENT,
        });
      };

      // Run multiple concurrent requests
      const results = await Promise.all([
        renderWithRequestId('REQUEST-AAA'),
        renderWithRequestId('REQUEST-BBB'),
        renderWithRequestId('REQUEST-CCC'),
      ]);

      // Each HTML should ONLY contain its own request ID
      expect(results[0]).toContain('REQUEST-AAA');
      expect(results[0]).not.toContain('REQUEST-BBB');
      expect(results[0]).not.toContain('REQUEST-CCC');

      expect(results[1]).toContain('REQUEST-BBB');
      expect(results[1]).not.toContain('REQUEST-AAA');
      expect(results[1]).not.toContain('REQUEST-CCC');

      expect(results[2]).toContain('REQUEST-CCC');
      expect(results[2]).not.toContain('REQUEST-AAA');
      expect(results[2]).not.toContain('REQUEST-BBB');
    });
  });

  describe('sensitive data isolation', () => {
    it('should not leak authentication tokens between requests', async () => {
      const AUTH_TOKEN = new InjectionToken<string>('AUTH_TOKEN');
      const API_KEY = new InjectionToken<string>('API_KEY');

      @Component({
        selector: 'app',
        template: `
          <div class="auth">Bearer: {{authToken}}</div>
          <div class="api-key">Key: {{apiKey}}</div>
        `,
      })
      class SensitiveDataComponent {
        authToken = inject(AUTH_TOKEN);
        apiKey = inject(API_KEY);
      }

      const renderWithSensitiveData = (
        authToken: string,
        apiKey: string,
      ): Promise<string> => {
        const providers = [
          provideServerRendering(),
          {provide: AUTH_TOKEN, useValue: authToken},
          {provide: API_KEY, useValue: apiKey},
        ];

        const bootstrap = (context: BootstrapContext) =>
          bootstrapApplication(SensitiveDataComponent, {providers}, context);

        return renderApplication(bootstrap, {
          document: DEFAULT_DOCUMENT,
        });
      };

      // Simulate concurrent requests with sensitive data
      const [htmlAdmin, htmlUser] = await Promise.all([
        renderWithSensitiveData('admin-secret-token-xyz', 'admin-api-key'),
        renderWithSensitiveData('user-public-token-abc', 'user-api-key'),
      ]);

      // CRITICAL SECURITY: Admin secrets must NOT leak to user's HTML
      expect(htmlUser).not.toContain('admin-secret-token-xyz');
      expect(htmlUser).not.toContain('admin-api-key');

      // CRITICAL SECURITY: User data must NOT leak to admin's HTML
      expect(htmlAdmin).not.toContain('user-public-token-abc');
      expect(htmlAdmin).not.toContain('user-api-key');

      // Verify correct data is present
      expect(htmlAdmin).toContain('admin-secret-token-xyz');
      expect(htmlUser).toContain('user-public-token-abc');
    });
  });
});
