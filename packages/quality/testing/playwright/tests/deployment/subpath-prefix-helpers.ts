import { isRecord } from '@n8n/utils/is-record';

import type { DeploymentProbe } from './probe';

export interface SubpathHealthCheck {
	prefixedStatus: number;
	unprefixedUrl: string;
	unprefixedStatus: number;
}

export interface WebhookSettingsCheck {
	ok: boolean;
	status: number;
	body: string;
	urlBaseWebhook: string;
	endpointWebhook: string;
}

export interface ProbedEditorAsset {
	path: string;
	url: string;
	status: number;
}

export interface EditorAssetsCheck {
	htmlStatus: number;
	html: string;
	assetPaths: string[];
	staticAsset: ProbedEditorAsset | null;
	compiledAsset: ProbedEditorAsset | null;
}

function extractEditorAssetPaths(html: string): string[] {
	const paths: string[] = [];
	const pattern = /(?:src|href)="([^"]*(?:assets|static)\/[^"]+)"/g;
	for (const match of html.matchAll(pattern)) {
		const path = match[1];
		if (path) {
			paths.push(path);
		}
	}
	return paths;
}

async function probeEditorAsset(
	probe: DeploymentProbe,
	assetPath: string | undefined,
): Promise<ProbedEditorAsset | null> {
	if (!assetPath) {
		return null;
	}
	const url = new URL(assetPath, probe.baseUrl).href;
	const response = await probe.fetch(url);
	return {
		path: assetPath,
		url,
		status: response.status(),
	};
}

/** Checks health endpoints under the configured prefix and at the origin root. */
export async function checkSubpathHealth(probe: DeploymentProbe): Promise<SubpathHealthCheck> {
	const prefixedResponse = await probe.fetch('healthz');
	const unprefixedUrl = new URL('/healthz', probe.baseUrl).href;
	const unprefixedResponse = await probe.fetch(unprefixedUrl);
	return {
		prefixedStatus: prefixedResponse.status(),
		unprefixedUrl,
		unprefixedStatus: unprefixedResponse.status(),
	};
}

/** Reads webhook base URL and endpoint settings from `rest/settings`. */
export async function readSubpathWebhookSettings(
	probe: DeploymentProbe,
): Promise<WebhookSettingsCheck> {
	const response = await probe.fetch('rest/settings');
	const status = response.status();
	const body = await response.text();
	if (!response.ok()) {
		return { ok: false, status, body, urlBaseWebhook: '', endpointWebhook: '' };
	}
	let parsed: unknown = null;
	try {
		parsed = JSON.parse(body);
	} catch {
		parsed = null;
	}
	const data =
		isRecord(parsed) && isRecord(parsed.data) ? parsed.data : isRecord(parsed) ? parsed : {};
	return {
		ok: true,
		status,
		body,
		urlBaseWebhook: typeof data.urlBaseWebhook === 'string' ? data.urlBaseWebhook : '',
		endpointWebhook: typeof data.endpointWebhook === 'string' ? data.endpointWebhook : '',
	};
}

/** Loads the editor HTML under `probe.baseUrl` and probes one `/static/` file and one `/assets/` file. */
export async function readSubpathEditorAssets(probe: DeploymentProbe): Promise<EditorAssetsCheck> {
	const editorResponse = await probe.fetch('', {
		headers: { accept: 'text/html' },
	});
	const html = await editorResponse.text();
	const assetPaths = extractEditorAssetPaths(html);
	const staticPath = assetPaths.find((assetPath) => /(?:^|\/)static\//.test(assetPath));
	const compiledPath = assetPaths.find((assetPath) => /(?:^|\/)assets\//.test(assetPath));

	const staticAsset = await probeEditorAsset(probe, staticPath);
	const compiledAsset = await probeEditorAsset(probe, compiledPath);

	return {
		htmlStatus: editorResponse.status(),
		html,
		assetPaths,
		staticAsset,
		compiledAsset,
	};
}
