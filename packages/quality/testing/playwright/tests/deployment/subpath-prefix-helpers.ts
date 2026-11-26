import { isRecord } from '@n8n/utils/is-record';

import type { DeploymentProbe } from './probe';

export interface SubpathHealthCheck {
	prefixedStatus: number;
	unprefixedUrl: string;
	unprefixedStatus: number;
}

export interface WebhookSettingsCheck {
	ok: boolean;
	urlBaseWebhook: string;
	endpointWebhook: string;
}

export interface EditorAssetsCheck {
	htmlStatus: number;
	html: string;
	assetPaths: string[];
	firstAssetUrl: string | null;
	firstAssetStatus: number | null;
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

/** Checks health endpoints both under the configured prefix and at the origin root. */
export async function checkSubpathHealth(probe: DeploymentProbe): Promise<SubpathHealthCheck> {
	const prefixedResponse = await probe.fetch('healthz');
	const unprefixedUrl = new URL('/healthz', probe.baseUrl).href;
	const unprefixedResponse = await fetch(unprefixedUrl);
	return {
		prefixedStatus: prefixedResponse.status(),
		unprefixedUrl,
		unprefixedStatus: unprefixedResponse.status,
	};
}

/** Reads webhook base URL and endpoint settings from `rest/settings`. */
export async function readSubpathWebhookSettings(
	probe: DeploymentProbe,
): Promise<WebhookSettingsCheck> {
	const response = await probe.fetch('rest/settings');
	if (!response.ok()) {
		return { ok: false, urlBaseWebhook: '', endpointWebhook: '' };
	}
	const body: unknown = await response.json();
	const data = isRecord(body) && isRecord(body.data) ? body.data : isRecord(body) ? body : {};
	return {
		ok: true,
		urlBaseWebhook: typeof data.urlBaseWebhook === 'string' ? data.urlBaseWebhook : '',
		endpointWebhook: typeof data.endpointWebhook === 'string' ? data.endpointWebhook : '',
	};
}

/** Loads the editor HTML under `probe.baseUrl` and probes its first compiled asset. */
export async function readSubpathEditorAssets(probe: DeploymentProbe): Promise<EditorAssetsCheck> {
	const editorResponse = await probe.fetch('', {
		headers: { accept: 'text/html' },
	});
	const html = await editorResponse.text();
	const assetPaths = extractEditorAssetPaths(html);
	if (assetPaths.length === 0) {
		return {
			htmlStatus: editorResponse.status(),
			html,
			assetPaths,
			firstAssetUrl: null,
			firstAssetStatus: null,
		};
	}

	const firstAssetUrl = new URL(assetPaths[0], probe.baseUrl).href;
	const firstAssetResponse = await fetch(firstAssetUrl);
	return {
		htmlStatus: editorResponse.status(),
		html,
		assetPaths,
		firstAssetUrl,
		firstAssetStatus: firstAssetResponse.status,
	};
}
