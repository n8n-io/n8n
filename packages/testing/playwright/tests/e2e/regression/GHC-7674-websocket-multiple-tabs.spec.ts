import { nanoid } from 'nanoid';

import { expect, test } from '../../../fixtures/base';

/**
 * Regression test for GHC-7674
 * https://github.com/n8n-io/n8n/issues/28281
 *
 * Bug: Opening multiple n8n tabs causes WebSocket connection lost errors
 * Root cause: pushRef is stored in sessionStorage with key 'n8n-client-id'.
 * In browsers, sessionStorage can be shared across tabs opened from the same origin,
 * causing multiple tabs to share the same pushRef. When this happens, the server
 * closes the previous connection when a new connection with the same pushRef arrives,
 * resulting in a connection battle between tabs.
 */
test.describe(
	'GHC-7674: Multiple tabs WebSocket stability',
	{
		annotation: [{ type: 'owner', description: 'Core' }],
	},
	() => {
		test('should maintain stable WebSocket connections in multiple tabs simultaneously', async ({
			n8n,
			api,
		}) => {
			// Create a workflow to ensure we're in the canvas where WebSocket is active
			const workflow = await api.workflows.createWorkflow({
				name: `Test Workflow ${nanoid()}`,
			});

			// Navigate to the workflow in the first tab
			await n8n.navigate.toWorkflow(workflow.id);

			// Wait for the WebSocket to be connected
			await expect
				.poll(
					async () => {
						return await n8n.page.evaluate(() => {
							const { usePushConnectionStore } = window;
							return usePushConnectionStore().isConnected;
						});
					},
					{ timeout: 10_000 },
				)
				.toBe(true);

			// Open a second "tab" using the same user (simulating duplicate tab)
			// This simulates the user duplicating the tab or opening n8n in a new tab
			const secondTab = await n8n.page.context().newPage();
			await secondTab.goto(n8n.page.url());

			// Wait for page to load
			await secondTab.waitForLoadState('networkidle');

			// Both tabs should maintain stable connections
			// This will FAIL because the second tab will close the first tab's connection
			// and they will fight each other, causing connection lost errors

			// Check that the first tab's connection is still active after a delay
			await n8n.page.waitForTimeout(2000);

			const firstTabConnected = await n8n.page.evaluate(() => {
				const { usePushConnectionStore } = window;
				return usePushConnectionStore().isConnected;
			});

			// Check that the second tab has a connection
			const secondTabConnected = await secondTab.evaluate(() => {
				const { usePushConnectionStore } = window;
				return usePushConnectionStore().isConnected;
			});

			// Both should be connected simultaneously
			expect(firstTabConnected).toBe(true);
			expect(secondTabConnected).toBe(true);

			// Monitor for connection stability over a longer period
			// In the buggy version, connections will repeatedly disconnect/reconnect
			const connectionLogs: Array<{ tab: string; timestamp: number; connected: boolean }> = [];

			for (let i = 0; i < 10; i++) {
				await n8n.page.waitForTimeout(1000);

				const tab1Connected = await n8n.page.evaluate(() => {
					const { usePushConnectionStore } = window;
					return usePushConnectionStore().isConnected;
				});

				const tab2Connected = await secondTab.evaluate(() => {
					const { usePushConnectionStore } = window;
					return usePushConnectionStore().isConnected;
				});

				connectionLogs.push({
					tab: 'tab1',
					timestamp: Date.now(),
					connected: tab1Connected,
				});

				connectionLogs.push({
					tab: 'tab2',
					timestamp: Date.now(),
					connected: tab2Connected,
				});

				// Both tabs should remain connected throughout
				expect(tab1Connected).toBe(true);
				expect(tab2Connected).toBe(true);
			}

			// Log the connection history for debugging
			console.log('Connection stability log:', connectionLogs);

			await secondTab.close();
		});

		test('should not cause connection loss when opening and closing tabs rapidly', async ({
			n8n,
			api,
		}) => {
			const workflow = await api.workflows.createWorkflow({
				name: `Test Workflow ${nanoid()}`,
			});

			await n8n.navigate.toWorkflow(workflow.id);

			// Wait for initial connection
			await expect
				.poll(
					async () => {
						return await n8n.page.evaluate(() => {
							const { usePushConnectionStore } = window;
							return usePushConnectionStore().isConnected;
						});
					},
					{ timeout: 10_000 },
				)
				.toBe(true);

			// Rapidly open and close tabs to stress test the connection
			for (let i = 0; i < 5; i++) {
				const tempTab = await n8n.page.context().newPage();
				await tempTab.goto(n8n.page.url());
				await tempTab.waitForLoadState('networkidle');
				await tempTab.close();

				// The original tab should maintain its connection
				const stillConnected = await n8n.page.evaluate(() => {
					const { usePushConnectionStore } = window;
					return usePushConnectionStore().isConnected;
				});

				expect(stillConnected).toBe(true);
			}
		});

		test('should generate unique pushRef for each browser context', async ({ n8n, api }) => {
			const workflow = await api.workflows.createWorkflow({
				name: `Test Workflow ${nanoid()}`,
			});

			await n8n.navigate.toWorkflow(workflow.id);

			// Get the pushRef from the first tab
			const firstPushRef = await n8n.page.evaluate(() => {
				const { useRootStore } = window;
				return useRootStore().pushRef;
			});

			// Open a second tab
			const secondTab = await n8n.page.context().newPage();
			await secondTab.goto(n8n.page.url());
			await secondTab.waitForLoadState('networkidle');

			// Get the pushRef from the second tab
			const secondPushRef = await secondTab.evaluate(() => {
				const { useRootStore } = window;
				return useRootStore().pushRef;
			});

			// The pushRefs should be different to prevent connection conflicts
			// This will FAIL because they currently share the same sessionStorage
			expect(firstPushRef).not.toBe(secondPushRef);

			await secondTab.close();
		});
	},
);
