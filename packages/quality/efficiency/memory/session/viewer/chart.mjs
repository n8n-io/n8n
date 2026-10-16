import {
	formatBytes,
	formatElapsed,
	memoryKeys,
	prepareChartData,
	requestKey,
} from './chart-data.mjs';

export function createMemoryChart(element, { t, onSelectRequest }) {
	const chart = globalThis.echarts.init(element, undefined, { renderer: 'canvas' });
	let latest;
	let previousSelection;
	let previousHideGaps;
	let manualZoom;
	let byteUnit = 1;
	let updating = false;
	const color = (name) => {
		// Resolve light-dark() and other CSS color functions before Canvas uses them.
		const probe = document.createElement('span');
		probe.style.color = `var(--${name})`;
		element.append(probe);
		const resolved = getComputedStyle(probe).color;
		probe.remove();
		return resolved;
	};
	const tooltip = (parameters) => {
		const rows = Array.isArray(parameters) ? parameters : [parameters];
		const content = document.createElement('div');
		const add = (text) => {
			const row = document.createElement('div');
			row.textContent = text;
			content.append(row);
		};
		const request = rows.find((row) => row.data?.request)?.data.request;
		if (request) {
			add(
				`${t(request.api === 'public' ? 'publicApi' : 'internalApi')}: ${request.method} ${request.route}`,
			);
			add(`${t('requestStartLabel')}: ${formatElapsed(request.elapsedMs)}`);
			add(
				`${t('requestStatus')}: ${request.aborted ? t('requestAborted') : (request.statusCode ?? t('requestUnfinished'))}`,
			);
			if (Number.isFinite(request.durationMs))
				add(`${t('requestDurationLabel')}: ${formatElapsed(request.durationMs)}`);
			return content;
		}
		const first = rows.find((row) => Number.isFinite(row.value?.[2]));
		if (first) add(`${t('chartElapsedTime')}: ${formatElapsed(first.value[2])}`);
		for (const row of rows) {
			if (Number.isFinite(row.value?.[1]))
				add(`${row.seriesName}: ${formatBytes(row.value[1] * byteUnit)}`);
		}
		return content;
	};

	chart.on('click', (event) => {
		if (event.data?.request) onSelectRequest?.(event.data.request);
	});
	chart.on('datazoom', () => {
		if (updating) return;
		const zoom = chart.getOption().dataZoom?.[0];
		if (zoom) manualZoom = { start: zoom.start, end: zoom.end };
	});

	function render(state) {
		latest = state;
		const data = prepareChartData(state);
		let peakBytes = 0;
		for (const points of Object.values(data.lines))
			for (const point of points) peakBytes = Math.max(peakBytes, point[1] ?? 0);
		const byteUnits = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
		const unitIndex = Math.min(
			byteUnits.length - 1,
			Math.max(0, Math.floor(Math.log2(peakBytes || 1) / 10)),
		);
		byteUnit = 1024 ** unitIndex;
		const timeUnit = data.max >= 7_200_000 ? 3_600_000 : data.max >= 300_000 ? 60_000 : 1000;
		const timeSuffix = timeUnit === 3_600_000 ? 'h' : timeUnit === 60_000 ? 'min' : 's';
		const axisTime = (ms) => `${Number((ms / timeUnit).toFixed(2))} ${timeSuffix}`;
		const colors = Object.fromEntries(memoryKeys.map((key) => [key, color(key)]));
		const text = color('text');
		const border = color('border');
		const surface = color('surface');
		const changedFocus =
			state.selectedRequest !== previousSelection || state.hideGaps !== previousHideGaps;
		if (changedFocus) manualZoom = undefined;
		previousSelection = state.selectedRequest;
		previousHideGaps = state.hideGaps;
		const requestHeight = data.endpoints.length
			? Math.min(100, 20 + data.endpoints.length * 12)
			: 0;
		const memoryTop = 48 + requestHeight;
		const memoryBottom = 84;
		const fontFamily = getComputedStyle(element).fontFamily;
		const series = memoryKeys.map((key) => ({
			id: key,
			name: t(key),
			type: 'line',
			data: data.lines[key].map(([time, bytes, elapsed]) => [
				time,
				bytes === null ? null : bytes / byteUnit,
				elapsed,
			]),
			encode: { x: 0, y: 1 },
			connectNulls: false,
			showSymbol: data.lines[key].filter((point) => point[1] !== null).length === 1,
			symbolSize: 7,
			lineStyle: { width: 2, color: colors[key] },
			itemStyle: { color: colors[key] },
			xAxisIndex: 0,
			yAxisIndex: 0,
			markLine:
				key === 'rss'
					? {
							silent: true,
							symbol: 'none',
							lineStyle: { color: text, type: 'dashed', opacity: 0.45 },
							label: { color: text, formatter: '{b}', position: 'insideEndTop' },
							data: data.markers.map((marker) => ({ name: marker.label, xAxis: marker.x })),
						}
					: undefined,
		}));
		const endpointNames = [];
		for (const [index, endpoint] of data.endpoints.entries()) {
			const name = `${t(endpoint.api === 'public' ? 'publicApi' : 'internalApi')}: ${endpoint.method} ${endpoint.route}`;
			endpointNames.push(name);
			const endpointColor = colors[memoryKeys[index % memoryKeys.length]];
			series.push({
				id: endpoint.key,
				name,
				type: 'custom',
				xAxisIndex: 1,
				yAxisIndex: 1,
				encode: { x: [0, 1], y: 2 },
				itemStyle: { color: endpointColor },
				tooltip: { trigger: 'item' },
				data: endpoint.requests.map(({ request, start, end }) => ({
					value: [start, end, index],
					request,
				})),
				renderItem: (_parameters, api) => {
					const start = api.coord([api.value(0), api.value(2)]);
					const end = api.coord([api.value(1), api.value(2)]);
					const request = endpoint.requests[_parameters.dataIndex]?.request;
					const selected = request && requestKey(request) === state.selectedRequest;
					const rect = globalThis.echarts.graphic.clipRectByRect(
						{ x: start[0] - 2, y: start[1] - 4, width: Math.max(5, end[0] - start[0]), height: 8 },
						{
							x: _parameters.coordSys.x,
							y: _parameters.coordSys.y,
							width: _parameters.coordSys.width,
							height: _parameters.coordSys.height,
						},
					);
					if (!rect) return;
					const children = [
						{
							type: 'rect',
							shape: rect,
							style: {
								fill: endpointColor,
								opacity: selected ? 1 : 0.65,
								stroke: selected ? text : undefined,
								lineWidth: selected ? 2 : 0,
							},
						},
					];
					if (
						state.favorites.has(endpoint.key) &&
						start[0] >= _parameters.coordSys.x &&
						start[0] <= _parameters.coordSys.x + _parameters.coordSys.width &&
						api.getHeight() - memoryBottom > memoryTop
					) {
						children.push({
							type: 'line',
							silent: true,
							shape: {
								x1: start[0],
								x2: start[0],
								y1: memoryTop,
								y2: api.getHeight() - memoryBottom,
							},
							style: { stroke: endpointColor, lineWidth: selected ? 2 : 1, opacity: 0.65 },
						});
					}
					return { type: 'group', children };
				},
			});
		}
		const zoom =
			manualZoom ??
			(data.focus
				? { startValue: data.focus.start, endValue: data.focus.end }
				: { start: 0, end: 100 });
		updating = true;
		chart.setOption(
			{
				animation: false,
				textStyle: { color: text, fontFamily },
				backgroundColor: surface,
				aria: { enabled: true },
				legend: {
					type: 'scroll',
					top: 0,
					left: 0,
					right: 0,
					textStyle: { color: text },
					pageTextStyle: { color: text },
					pageIconColor: text,
					data: [...memoryKeys.map(t), ...endpointNames],
				},
				grid: [
					{ left: 84, right: 20, top: memoryTop, bottom: memoryBottom },
					{ left: 84, right: 20, top: 36, height: requestHeight || 1 },
				],
				xAxis: [
					{
						type: 'value',
						min: data.min,
						max: data.max,
						name: t(state.hideGaps ? 'chartRecordedTime' : 'chartElapsedTime'),
						nameLocation: 'middle',
						nameGap: 34,
						axisLabel: { color: text, formatter: axisTime, hideOverlap: true },
						axisLine: { lineStyle: { color: border } },
						splitLine: { lineStyle: { color: border, opacity: 0.35 } },
					},
					{ type: 'value', gridIndex: 1, min: data.min, max: data.max, show: false },
				],
				yAxis: [
					{
						type: 'value',
						min: 0,
						name: t('chartMemory'),
						nameTextStyle: { align: 'left' },
						axisLabel: {
							color: text,
							formatter: (value) => `${value} ${byteUnits[unitIndex]}`,
							hideOverlap: true,
						},
						splitLine: { lineStyle: { color: border, opacity: 0.5 } },
					},
					{ type: 'category', gridIndex: 1, data: endpointNames, show: false },
				],
				tooltip: {
					trigger: 'axis',
					confine: true,
					backgroundColor: surface,
					borderColor: border,
					textStyle: { color: text, fontFamily },
					formatter: tooltip,
				},
				dataZoom: [
					{
						type: 'slider',
						xAxisIndex: [0, 1],
						filterMode: 'none',
						bottom: 0,
						height: 24,
						textStyle: { color: text },
						labelFormatter: axisTime,
						borderColor: border,
						...zoom,
					},
				],
				series,
			},
			{ replaceMerge: ['series'], lazyUpdate: false },
		);
		updating = false;
	}

	const observer = new ResizeObserver(() => chart.resize());
	observer.observe(element);
	const media = matchMedia('(prefers-color-scheme: dark)');
	const updateTheme = () => latest && render(latest);
	media.addEventListener('change', updateTheme);
	return {
		render,
		resize: () => chart.resize(),
		dispose() {
			observer.disconnect();
			media.removeEventListener('change', updateTheme);
			chart.dispose();
		},
	};
}
