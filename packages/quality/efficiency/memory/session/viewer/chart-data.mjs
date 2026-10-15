export const memoryKeys = ['rss', 'heapUsed', 'heapTotal', 'external'];

export const endpointKey = (request) =>
	JSON.stringify([request.api, request.method, request.route]);

export const requestKey = (request) => `${request.segmentId}:${request.id}`;

export function profileForRequest(profiles, request) {
	const matching = profiles.filter(
		(profile) =>
			profile.segmentId === request.segmentId && profile.recordingId === request.recordingId,
	);
	return (
		matching.find(
			(profile) => profile.elapsedMs >= request.elapsedMs + (request.durationMs ?? 0),
		) ?? matching.at(-1)
	);
}

export function formatElapsed(ms) {
	const seconds = ms / 1000;
	if (Math.abs(ms) < 1000 && ms !== 0) return `${Math.round(ms)} ms`;
	if (Math.abs(seconds) < 60) return `${Number(seconds.toFixed(2))} s`;
	if (Math.abs(seconds) < 3600) return `${Number((seconds / 60).toFixed(2))} min`;
	return `${Number((seconds / 3600).toFixed(2))} h`;
}

export function formatBytes(bytes) {
	const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
	let index = 0;
	let value = bytes;
	while (Math.abs(value) >= 1024 && index < units.length - 1) {
		value /= 1024;
		index++;
	}
	return `${Number(value.toFixed(2)).toLocaleString()} ${units[index]}`;
}

function mergeGaps(gaps) {
	const merged = [];
	for (const gap of gaps.sort((left, right) => left.start - right.start)) {
		if (!Number.isFinite(gap.start) || !Number.isFinite(gap.end) || gap.end <= gap.start) continue;
		const previous = merged.at(-1);
		if (previous && gap.start <= previous.end) previous.end = Math.max(previous.end, gap.end);
		else merged.push({ ...gap });
	}
	return merged;
}

export function createTimeMapping(points, session, hideGaps) {
	const intervalMs = Math.max(1, session.settings?.intervalMs ?? 1000);
	const lastElapsedMs = points.at(-1)?.elapsedMs ?? 0;
	const intervals = session.recordingIntervals ?? [];
	const gaps = (session.pauses ?? []).map((pause) => ({
		start: pause.startElapsedMs,
		end: pause.endElapsedMs ?? lastElapsedMs,
	}));
	for (let index = 1; index < intervals.length; index++) {
		gaps.push({ start: intervals[index - 1].endElapsedMs, end: intervals[index].startElapsedMs });
	}
	for (let index = 1; index < points.length; index++) {
		const previous = points[index - 1];
		const current = points[index];
		const sampleIntervalMs = previous.intervalMs ?? intervalMs;
		if (current.elapsedMs - previous.elapsedMs > sampleIntervalMs * 2.5)
			gaps.push({ start: previous.elapsedMs + sampleIntervalMs, end: current.elapsedMs });
	}
	const merged = mergeGaps(gaps);
	const toDisplay = (elapsedMs) => {
		if (!hideGaps) return elapsedMs;
		let removed = 0;
		for (const gap of merged) {
			if (elapsedMs <= gap.start) break;
			removed += Math.min(elapsedMs, gap.end) - gap.start;
		}
		return elapsedMs - removed;
	};
	const intervalId = (point) => {
		if (point.recordingId !== undefined) return point.recordingId;
		return intervals.find(
			(interval) =>
				point.elapsedMs >= interval.startElapsedMs &&
				(interval.endElapsedMs === null || point.elapsedMs <= interval.endElapsedMs),
		)?.id;
	};
	const isBreak = (previous, current) =>
		previous.segmentId !== current.segmentId ||
		intervalId(previous) !== intervalId(current) ||
		current.elapsedMs - previous.elapsedMs > (previous.intervalMs ?? intervalMs) * 2.5 ||
		merged.some((gap) => gap.start < current.elapsedMs && gap.end > previous.elapsedMs);
	return { toDisplay, isBreak, gaps: merged, intervalMs };
}

export function prepareChartData({ report, favorites = new Set(), selectedRequest, hideGaps }) {
	const points = (report.timeline ?? [])
		.filter((point) => Number.isFinite(point.elapsedMs) && point.memory)
		.slice()
		.sort((left, right) => left.elapsedMs - right.elapsedMs);
	const mapping = createTimeMapping(points, report.session ?? {}, hideGaps);
	const requests = (report.requests?.recent ?? []).filter((request) =>
		Number.isFinite(request.elapsedMs),
	);
	const selected = requests.find((request) => requestKey(request) === selectedRequest);
	const lines = Object.fromEntries(
		memoryKeys.map((key) => {
			const data = [];
			let previous;
			for (const point of points) {
				if (!Number.isFinite(point.memory[key])) {
					if (previous) data.push([mapping.toDisplay(point.elapsedMs), null, point.elapsedMs]);
					previous = undefined;
					continue;
				}
				if (previous && mapping.isBreak(previous, point))
					data.push([mapping.toDisplay(point.elapsedMs), null, point.elapsedMs]);
				data.push([mapping.toDisplay(point.elapsedMs), point.memory[key], point.elapsedMs]);
				previous = point;
			}
			return [key, data];
		}),
	);
	const endpoints = new Map();
	for (const request of requests) {
		const key = endpointKey(request);
		if (!favorites.has(key) && requestKey(request) !== selectedRequest) continue;
		const endpoint = endpoints.get(key) ?? { key, ...request, requests: [] };
		endpoint.requests.push({
			request,
			start: mapping.toDisplay(request.elapsedMs),
			end: mapping.toDisplay(request.elapsedMs + Math.max(0, request.durationMs ?? 0)),
		});
		endpoints.set(key, endpoint);
	}
	const markers = (report.session?.markers ?? [])
		.filter((marker) => Number.isFinite(marker.elapsedMs))
		.map((marker) => ({ ...marker, x: mapping.toDisplay(marker.elapsedMs) }));
	let first = points[0]?.elapsedMs ?? 0;
	let last = points.at(-1)?.elapsedMs ?? first + mapping.intervalMs;
	for (const marker of markers) {
		first = Math.min(first, marker.elapsedMs);
		last = Math.max(last, marker.elapsedMs);
	}
	for (const request of requests) {
		if (!favorites.has(endpointKey(request)) && requestKey(request) !== selectedRequest) continue;
		first = Math.min(first, request.elapsedMs);
		last = Math.max(last, request.elapsedMs + (request.durationMs ?? 0));
	}
	const padding = mapping.intervalMs * 2;
	const focus = selected
		? {
				start: mapping.toDisplay(Math.max(0, selected.elapsedMs - padding)),
				end: mapping.toDisplay(selected.elapsedMs + (selected.durationMs ?? 0) + padding),
			}
		: undefined;
	const min = Math.min(mapping.toDisplay(first), focus?.start ?? Infinity);
	const max = Math.max(mapping.toDisplay(last), focus?.end ?? -Infinity, min + mapping.intervalMs);
	return { lines, endpoints: [...endpoints.values()], markers, focus, min, max, mapping };
}
