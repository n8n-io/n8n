/** Find the active test-module window in Vitest reporter output. */
export function vitestWindow(log, start, end) {
	const startedAt = new Date(start).getTime();
	const completedAt = new Date(end).getTime();
	const markers = [];
	for (const line of log.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, '').split(/\r?\n/)) {
		const payload = line.match(/N8N_VITEST_PHASE (\{[^\r\n]+\})/)?.[1];
		if (!payload) continue;
		try {
			const marker = JSON.parse(payload);
			const first = Date.parse(marker.firstModuleStart);
			const last = Date.parse(marker.lastModuleEnd);
			if (
				marker.version === 1 &&
				Number.isFinite(first) &&
				Number.isFinite(last) &&
				first >= startedAt - 1000 &&
				last <= completedAt + 1000 &&
				first <= last
			) {
				markers.push({ first, last });
			}
		} catch {
			// Ignore malformed or unrelated log lines.
		}
	}
	if (!markers.length) return null;
	const first = Math.max(startedAt, Math.min(...markers.map((marker) => marker.first)));
	const last = Math.min(completedAt, Math.max(...markers.map((marker) => marker.last)));
	return last < first ? null : { first, last, processes: markers.length };
}
