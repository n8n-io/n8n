import { mkdir, readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test, expect } from 'n8n-playwright/test';

import { serveViewer } from '../viewer.mjs';

test('edits a persistent dashboard and controls recording', async ({ page }) => {
	const directory = await mkdtemp(join(tmpdir(), 'n8n-memory-viewer-'));
	const status = {
		phase: 'measurement',
		ready: true,
		capabilities: { metrics: true, requests: true, allocations: true, snapshots: true },
		capture: { metrics: true, requests: true, allocations: false, intervalMs: 1000 },
	};
	const actions = [];
	let viewer;
	let replay;
	const errors = [];
	page.on('pageerror', (error) => errors.push(error.message));
	try {
		await mkdir(join(directory, 'profiles'));
		await writeFile(join(directory, 'profiles/locations.json'), '[]');
		await writeFile(
			join(directory, 'session.json'),
			JSON.stringify({
				schemaVersion: 1,
				kind: 'n8n-memory-session',
				status: 'recording',
				timeline: 'timeline.ndjson',
				requests: 'requests.ndjson',
				settings: { intervalMs: 1000, requestTracking: true },
				metadata: { node: 'v24' },
				segments: [{ id: 'process-1' }],
				profiles: [
					{
						segmentId: 'process-1',
						elapsedMs: 8000,
						file: 'profiles/test.heapprofile',
						locationsFile: 'profiles/locations.json',
					},
				],
				snapshots: [],
				markers: [],
				gaps: [],
				errors: [],
				pauses: [{ startElapsedMs: 2000, endElapsedMs: 7000 }],
			}),
		);
		await writeFile(
			join(directory, 'timeline.ndjson'),
			[1000, 2000, 7000, 8000]
				.map((elapsedMs) =>
					JSON.stringify({
						phase: 'measurement',
						segmentId: 'process-1',
						elapsedMs,
						memory: { rss: 104857600, heapUsed: 52428800, heapTotal: 73400320, external: 1048576 },
					}),
				)
				.join('\n'),
		);
		await writeFile(
			join(directory, 'requests.ndjson'),
			[
				{
					id: 2,
					segmentId: 'process-1',
					event: 'finish',
					api: 'public',
					method: 'POST',
					route: '/api/v1/credentials/:id',
					elapsedMs: 1500,
					durationMs: 123.78,
					statusCode: 401,
				},
				{
					id: 1,
					segmentId: 'process-1',
					event: 'finish',
					api: 'internal',
					method: 'GET',
					route: '/rest/workflows/:id',
					elapsedMs: 7500,
					durationMs: 50.49,
					statusCode: 200,
				},
			]
				.map((request) => JSON.stringify(request))
				.join('\n'),
		);
		viewer = await serveViewer({
			input: join(directory, 'session.json'),
			getStatus: () => status,
			controls: {
				configure: async (body) => {
					Object.assign(status.capture, body);
					return { capture: status.capture };
				},
				...Object.fromEntries(
					['pause', 'resume', 'stop'].map((action) => [
						action,
						async () => {
							actions.push(action);
							status.phase =
								action === 'pause' ? 'paused' : action === 'resume' ? 'measurement' : 'complete';
							return { accepted: true };
						},
					]),
				),
			},
		});
		await page.setViewportSize({ width: 1440, height: 1000 });
		await page.goto(viewer.url);
		await expect(page.locator('#chart canvas')).toBeVisible();
		await page.locator('#requests .favorite-endpoint').first().click();
		await expect(page.locator('#favorite-endpoints button')).toHaveCount(1);
		await expect(page.locator('#requests tbody tr').first().locator('td').last()).toHaveText('50');
		await expect(page.locator('#requests tbody tr').last().locator('td').last()).toHaveText('124');
		await expect(page.locator('#requests .favorite-endpoint').first()).toHaveCSS(
			'border-width',
			'0px',
		);
		await expect(page.locator('#requests .request-start').first()).toHaveCSS('border-width', '0px');
		await expect(page.locator('#requests .endpoint-pin')).toHaveCount(2);
		const search = page.getByRole('searchbox', { name: 'Search API requests' });
		for (const [query, column, expected] of [
			['7.5', 1, '7.5'],
			['INTERNAL', 2, 'Internal'],
			['get', 3, 'GET'],
			['WORKFLOWS', 4, 'workflows'],
			['200', 5, '200'],
			['124', 6, '124'],
		]) {
			await search.fill(query);
			await expect(page.locator('#requests tbody tr')).toHaveCount(1);
			await expect(page.locator('#requests tbody td').nth(column).locator('mark')).toHaveText(
				expected,
			);
		}
		await search.fill('not pinned');
		await expect(page.locator('#requests tbody tr')).toHaveCount(1);
		await expect(page.locator('#requests .search-match')).toHaveAttribute('aria-pressed', 'false');
		await search.fill('/');
		await expect(page.locator('#requests tbody tr')).toHaveCount(2);
		await expect(page.locator('#requests mark')).toHaveCount(7);
		await search.fill('[');
		await expect(page.locator('#requests')).toHaveText('No matching requests. Try another search.');
		await search.fill('workflows');
		await page.waitForResponse((response) => response.url().endsWith('/api/report'));
		await expect(search).toHaveValue('workflows');
		await expect(page.locator('#requests tbody tr')).toHaveCount(1);
		await expect(page.locator('#requests mark')).toHaveText('workflows');
		await search.fill('');
		await expect(page.locator('#requests tbody tr')).toHaveCount(2);
		await expect(page.locator('#requests mark')).toHaveCount(0);
		const chartOption = async () =>
			await page.evaluate(() =>
				globalThis.echarts.getInstanceByDom(document.getElementById('chart')).getOption(),
			);
		expect((await chartOption()).series.filter((series) => series.type === 'custom')).toHaveLength(
			1,
		);
		const originalMax = (await chartOption()).xAxis[0].max;
		await page.locator('#chart').scrollIntoViewIfNeeded();
		const zoomBeforeScroll = (await chartOption()).dataZoom.map(({ start, end }) => [start, end]);
		const scrollBefore = await page.evaluate(() => scrollY);
		await page.locator('#chart').hover();
		await page.mouse.wheel(0, 200);
		await expect.poll(async () => await page.evaluate(() => scrollY)).toBeGreaterThan(scrollBefore);
		expect((await chartOption()).dataZoom.map(({ start, end }) => [start, end])).toEqual(
			zoomBeforeScroll,
		);
		await page.locator('#chart').scrollIntoViewIfNeeded();
		const sliderHandle = await page.locator('#chart').evaluate((node) => {
			const chart = globalThis.echarts.getInstanceByDom(node);
			const view = chart.getViewOfComponentModel(chart.getModel().getComponent('dataZoom'));
			let position;
			view.group.traverse((shape) => {
				if (position || shape.type !== 'path' || !shape.draggable) return;
				const bounds = shape.getBoundingRect();
				position = shape.transformCoordToGlobal(
					bounds.x + bounds.width / 2,
					bounds.y + bounds.height / 2,
				);
			});
			const bounds = node.getBoundingClientRect();
			return { x: bounds.x + position[0], y: bounds.y + position[1] };
		});
		await page.mouse.move(sliderHandle.x, sliderHandle.y);
		await page.mouse.down();
		await page.mouse.move(sliderHandle.x + 100, sliderHandle.y, { steps: 5 });
		await page.mouse.up();
		await expect.poll(async () => (await chartOption()).dataZoom[0].start).toBeGreaterThan(0);
		const requestPosition = await page.locator('#chart').evaluate((node) => {
			const chart = globalThis.echarts.getInstanceByDom(node);
			const [x, y] = chart.convertToPixel({ xAxisIndex: 1, yAxisIndex: 1 }, [7525, 0]);
			const bounds = node.getBoundingClientRect();
			return { x: bounds.x + x, y: bounds.y + y };
		});
		await page.mouse.move(requestPosition.x, requestPosition.y);
		await expect(page.locator('#chart')).toContainText('GET /rest/workflows/:id');
		await page.mouse.click(requestPosition.x, requestPosition.y);
		await expect(page.locator('#all-requests')).toBeVisible();
		await page.locator('#all-requests').click();
		await page.locator('#hide-gaps').check();
		expect((await chartOption()).xAxis[0].max).toBeLessThan(originalMax);
		await page.locator('#requests tbody td').nth(1).locator('button').click();
		await expect(page.locator('#all-requests')).toBeVisible();
		await expect(page.locator('#profile')).toHaveValue('0');
		await page.locator('#all-requests').click();
		await page.locator('#toggle-layout').click();
		await expect(page.locator('#dashboard')).toHaveCSS('background-image', /linear-gradient/);
		const guides = await page.locator('#dashboard').evaluate((node) => {
			const [width, height] = getComputedStyle(node).backgroundSize.split(',')[0].split(' ');
			return {
				columnPercent: Number.parseFloat(width),
				rowHeight: Number.parseFloat(height),
				columns: node.gridstack.getColumn(),
				cellHeight: node.gridstack.getCellHeight(true),
			};
		});
		expect(guides.columnPercent).toBeCloseTo(100 / guides.columns);
		expect(guides.rowHeight).toBe(guides.cellHeight);
		const timeline = page.locator('[data-card-id="timeline-section"]');
		const initial = await timeline.boundingBox();
		const corner = await timeline.locator('.ui-resizable-se').boundingBox();
		await page.mouse.move(corner.x + corner.width / 2, corner.y + corner.height / 2);
		await page.mouse.down();
		await page.mouse.move(corner.x - 200, corner.y + 64, { steps: 10 });
		await page.mouse.up();
		await expect.poll(async () => (await timeline.boundingBox()).width).toBeLessThan(initial.width);
		const resized = await timeline.boundingBox();
		await timeline.locator('.card-keyboard-resize').focus();
		await page.keyboard.press('ArrowDown');
		await expect
			.poll(async () => (await timeline.boundingBox()).height)
			.toBeGreaterThan(resized.height);
		await page.locator('[data-card-id="markers-section"] button[title="Remove card"]').click();
		await page.reload();
		await expect(page.locator('#markers-section')).toBeHidden();
		await expect(page.locator('#favorite-endpoints button')).toHaveCount(1);
		await expect(page.locator('#hide-gaps')).toBeChecked();
		await expect(page.locator('#toggle-layout')).toHaveAttribute('aria-pressed', 'false');
		await page.locator('#toggle-layout').click();
		await page.locator('#add-card-select').selectOption('markers-section');
		await page.locator('#add-card').click();
		await expect(page.locator('#markers-section')).toBeVisible();
		await page.locator('#reset-layout').click();
		await expect(timeline).toHaveAttribute('gs-w', '12');
		await page.evaluate(() => {
			const key = 'n8n-memory-dashboard-v1';
			const saved = JSON.parse(localStorage.getItem(key));
			for (const card of saved.cards) card.y += 5;
			localStorage.setItem(key, JSON.stringify(saved));
		});
		await page.reload();
		await expect(timeline).toHaveAttribute('gs-y', '0');
		await expect(page.locator('#dashboard')).toHaveCSS('background-image', 'none');
		await page.locator('#toggle-layout').click();
		const requests = page.locator('[data-card-id="requests-section"]');
		await expect(requests).toHaveAttribute('gs-y', '8');
		await timeline.locator('button[title="Remove card"]').click();
		await expect(requests).toHaveAttribute('gs-y', '0');
		await page.locator('#reset-layout').click();
		await page.locator('#toggle-layout').click();
		await page.getByText('Capture settings', { exact: true }).click();
		const metrics = page.getByRole('checkbox', { name: 'Memory metrics', exact: true });
		const requestsToggle = page.getByRole('checkbox', { name: 'API request timings', exact: true });
		const allocationsToggle = page.getByRole('checkbox', {
			name: 'Allocation sampling',
			exact: true,
		});
		await expect(metrics).toBeChecked();
		await expect(requestsToggle).toBeChecked();
		await expect(allocationsToggle).not.toBeChecked();
		await allocationsToggle.check();
		await expect.poll(() => status.capture.allocations).toBe(true);
		await page.reload();
		await page.getByText('Capture settings', { exact: true }).click();
		await expect(allocationsToggle).toBeChecked();
		await allocationsToggle.uncheck();
		await expect.poll(() => status.capture.allocations).toBe(false);
		await requestsToggle.uncheck();
		await expect(page.locator('#requests-status')).toContainText('API request capture is off');
		await expect(page.locator('#requests tbody tr')).toHaveCount(2);
		await metrics.uncheck();
		await expect(page.locator('#phase')).toHaveText('Collection off');
		await expect(page.getByLabel('Metric interval', { exact: true })).toBeDisabled();
		await metrics.check();
		await page.getByLabel('Metric interval', { exact: true }).selectOption('5000');
		await expect.poll(() => status.capture.intervalMs).toBe(5000);
		await requestsToggle.check();
		status.capabilities.allocations = false;
		status.capabilities.requests = false;
		status.capabilities.snapshots = false;
		await expect(allocationsToggle).toBeDisabled();
		await expect(requestsToggle).toBeDisabled();
		await expect(page.locator('#snapshot')).toBeDisabled();
		await expect(page.locator('#capture-unavailable')).toContainText(
			'Start a new session without --metrics-only',
		);
		await metrics.uncheck();
		await expect(page.locator('#phase')).toHaveText('Collection off');
		await metrics.check();
		status.capabilities.allocations = true;
		status.capabilities.requests = true;
		status.capabilities.snapshots = true;
		await expect(allocationsToggle).toBeEnabled();
		await page.locator('#pause-recording').click();
		await expect(page.locator('#phase')).toHaveText('Recording paused');
		await expect(page.locator('#pause-recording')).toBeDisabled();
		await allocationsToggle.check();
		await expect(page.locator('#phase')).toHaveText('Recording paused');
		await expect.poll(() => status.capture.allocations).toBe(true);
		await page.locator('#start-recording').click();
		await expect(page.locator('#phase')).toHaveText('Recording');
		await page.setViewportSize({ width: 390, height: 844 });
		await expect
			.poll(
				async () => await page.locator('#dashboard').evaluate((node) => node.gridstack.getColumn()),
			)
			.toBe(1);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
			390,
		);
		await page.locator('#finish-session').click();
		await expect(page.locator('#controls')).toBeHidden();
		await expect(page.locator('#capture-options')).toBeHidden();
		expect(actions).toEqual(['pause', 'resume', 'stop']);
		const input = join(directory, 'session.json');
		const session = JSON.parse(await readFile(input, 'utf8'));
		session.status = 'complete';
		await writeFile(input, JSON.stringify(session));
		replay = await serveViewer({ input });
		await page.goto(replay.url);
		await expect(page.locator('#phase')).toHaveText('Complete');
		await expect(page.locator('#capture-options')).toBeHidden();
		await expect(page.locator('#recording-actions')).toBeHidden();
		expect(errors).toEqual([]);
	} finally {
		await replay?.close();
		await viewer?.close();
		await rm(directory, { recursive: true, force: true });
	}
});
