export const VOICE_PRESETS = {
	xiaohe: { speaker: 'zh_female_xiaohe_uranus_bigtts', label: '小何' },
	vivi: { speaker: 'zh_female_vv_uranus_bigtts', label: 'Vivi' },
	yunzhou: { speaker: 'zh_male_m191_uranus_bigtts', label: '云舟' },
	xiaotian: { speaker: 'zh_male_taocheng_uranus_bigtts', label: '小天' },
	cute_girl: { speaker: 'saturn_zh_female_keainvsheng_tob', label: '可爱女生' },
	cheerful_boy: { speaker: 'saturn_zh_male_shuanglangshaonian_tob', label: '爽朗少年' },
};

export function resolveVoicePreset(key, fallbackSpeaker = '') {
	const normalized = String(key ?? '').trim();
	if (!normalized && fallbackSpeaker) {
		return { speaker: fallbackSpeaker, label: 'fallback' };
	}

	const preset = VOICE_PRESETS[normalized];
	if (!preset) {
		throw new Error(`Unknown voice preset: ${normalized || '(empty)'}`);
	}

	return preset;
}

export function extractJsonObject(text) {
	const raw = String(text ?? '');
	const start = raw.indexOf('{');
	if (start === -1) throw new Error('LLM response did not contain a JSON object');

	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let index = start; index < raw.length; index += 1) {
		const char = raw[index];
		if (inString) {
			if (escaped) escaped = false;
			else if (char === '\\') escaped = true;
			else if (char === '"') inString = false;
			continue;
		}
		if (char === '"') inString = true;
		else if (char === '{') depth += 1;
		else if (char === '}') {
			depth -= 1;
			if (depth === 0) return raw.slice(start, index + 1);
		}
	}

	throw new Error('LLM response contained an incomplete JSON object');
}

export function parseGeneratedScript(raw, expectedMode) {
	const parsed = JSON.parse(extractJsonObject(raw));
	const mode = String(parsed.mode ?? '').trim();
	if (!['single', 'dialogue'].includes(mode)) {
		throw new Error(`Generated script mode must be single or dialogue, got: ${mode || '(empty)'}`);
	}
	if (expectedMode && mode !== expectedMode) {
		throw new Error(`Generated script mode ${mode} does not match requested mode ${expectedMode}`);
	}
	if (!Array.isArray(parsed.segments) || parsed.segments.length === 0) {
		throw new Error('Generated script segments must be a non-empty array');
	}
	if (mode === 'dialogue' && parsed.segments.length > 12) {
		throw new Error('dialogue mode supports at most 12 segments');
	}

	const segments = parsed.segments.map((segment, index) => {
		const role = String(segment?.role ?? '').trim();
		const text = String(segment?.text ?? '').trim();
		if (!text) throw new Error(`Generated script segment ${index + 1} text is empty`);
		if (mode === 'single' && role !== 'narrator') {
			throw new Error('single mode only allows narrator role');
		}
		if (mode === 'dialogue' && !['A', 'B'].includes(role)) {
			throw new Error('dialogue mode only allows roles A and B');
		}

		return { role, text };
	});

	return {
		mode,
		title: String(parsed.title ?? '').trim(),
		summary: String(parsed.summary ?? '').trim(),
		segments,
	};
}

export function buildGeneratedScriptText(script) {
	const segments = Array.isArray(script?.segments) ? script.segments : [];
	if (script?.mode === 'dialogue') {
		return segments.map((segment) => `${segment.role}：${segment.text}`).join('\n');
	}

	return segments.map((segment) => segment.text).join('\n');
}

function sanitizeRole(role) {
	return String(role || 'segment').replace(/[^A-Za-z0-9_-]/g, '');
}

function segmentPaths(segmentsDir, index, role) {
	const prefix = `${String(index).padStart(3, '0')}-${sanitizeRole(role)}`;

	return {
		audioPath: `${segmentsDir}/${prefix}.mp3`,
		timingPath: `${segmentsDir}/${prefix}-timing.json`,
		responsePath: `${segmentsDir}/${prefix}-response.jsonstream`,
	};
}

export function buildTtsSegments(script, selections = {}, paths = {}) {
	const segmentsDir = String(paths.segmentsDir ?? '').replace(/\/+$/, '');
	if (!segmentsDir) throw new Error('buildTtsSegments requires paths.segmentsDir');
	const fallbackSpeaker = paths.fallbackSpeaker ?? '';

	if (script.mode === 'single') {
		const voice = resolveVoicePreset(selections.voiceSingle, fallbackSpeaker);
		const text = script.segments.map((segment) => segment.text).join('\n');
		const outputPaths = segmentPaths(segmentsDir, 1, 'narrator');

		return [{
			segmentIndex: 1,
			role: 'narrator',
			speaker: voice.speaker,
			text,
			...outputPaths,
		}];
	}

	return script.segments.map((segment, index) => {
		const presetKey = segment.role === 'A' ? selections.voiceA : selections.voiceB;
		const voice = resolveVoicePreset(presetKey, fallbackSpeaker);
		const outputPaths = segmentPaths(segmentsDir, index + 1, segment.role);

		return {
			segmentIndex: index + 1,
			role: segment.role,
			speaker: voice.speaker,
			text: segment.text,
			...outputPaths,
		};
	});
}

function parseSseFrames(text) {
	const frames = [];
	for (const block of String(text).split(/\r?\n\r?\n/)) {
		const dataLines = block
			.split(/\r?\n/)
			.filter((line) => line.startsWith('data:'))
			.map((line) => line.slice(5).trim())
			.filter(Boolean);
		for (const data of dataLines) frames.push(JSON.parse(data));
	}

	return frames;
}

function parseJsonStream(text) {
	const raw = String(text ?? '');
	const frames = [];
	let index = 0;
	while (index < raw.length) {
		while (index < raw.length && /\s/.test(raw[index])) index += 1;
		if (index >= raw.length) break;
		let depth = 0;
		let inString = false;
		let escaped = false;
		let end = index;
		for (; end < raw.length; end += 1) {
			const char = raw[end];
			if (inString) {
				if (escaped) escaped = false;
				else if (char === '\\') escaped = true;
				else if (char === '"') inString = false;
				continue;
			}
			if (char === '"') inString = true;
			else if (char === '{') depth += 1;
			else if (char === '}') {
				depth -= 1;
				if (depth === 0) {
					end += 1;
					break;
				}
			}
		}
		if (end <= index || depth !== 0) break;
		frames.push(JSON.parse(raw.slice(index, end)));
		index = end;
	}

	return frames;
}

export function parseTtsResponseFrames(raw) {
	const text = String(raw ?? '');
	if (/^data:/m.test(text) || /^event:/m.test(text)) {
		const frames = parseSseFrames(text);
		if (frames.length > 0) return frames;
	}

	return parseJsonStream(text);
}

export function extractAudioAndTiming(frames) {
	return {
		audioBase64Chunks: frames
			.map((frame) => frame?.data)
			.filter((data) => typeof data === 'string' && data.length > 0),
		timingFrames: frames
			.map((frame) => (frame?.sentence ? { sentence: frame.sentence } : null))
			.filter(Boolean),
	};
}

function shiftNumber(value, offset) {
	if (typeof value === 'number' && Number.isFinite(value)) return value + offset;
	if (typeof value === 'string' && value.trim()) {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed + offset;
	}

	return value;
}

function shiftTimingObject(value, offset) {
	if (Array.isArray(value)) return value.map((item) => shiftTimingObject(item, offset));
	if (!value || typeof value !== 'object') return value;

	const shifted = {};
	for (const [key, child] of Object.entries(value)) {
		if (/^(start|end|startTime|endTime|start_time|end_time|begin|stop)$/i.test(key)) {
			shifted[key] = shiftNumber(child, offset);
		} else {
			shifted[key] = shiftTimingObject(child, offset);
		}
	}

	return shifted;
}

export function mergeTimingEvents(segmentMetas, options = {}) {
	const pauseSeconds = Math.max(0, Number(options.pauseSeconds ?? 0) || 0);
	const frames = [];
	let offset = 0;

	for (const [index, segment] of segmentMetas.entries()) {
		for (const frame of Array.isArray(segment.timingFrames) ? segment.timingFrames : []) {
			frames.push(shiftTimingObject(frame, offset));
		}
		offset += Math.max(0, Number(segment.duration) || 0);
		if (index < segmentMetas.length - 1) offset += pauseSeconds;
	}

	return { frames, duration: offset };
}
