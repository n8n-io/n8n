import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { PerplexityV2 } from './v2/PerplexityV2.node';
import { PerplexityV3 } from './v3/PerplexityV3.node';

export class Perplexity extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Perplexity',
			name: 'perplexity',
			icon: {
				light: 'file:perplexity.svg',
				dark: 'file:perplexity.dark.svg',
			},
			group: ['transform'],
			subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
			description:
				'AI-powered answer engine that provides accurate, trusted, and real-time answers to any question. Supports agent responses, web search, and embeddings.',
			defaultVersion: 3,
		};

		const v2 = new PerplexityV2(baseDescription);
		const v3 = new PerplexityV3(baseDescription);

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: v2,
			2: v2,
			3: v3,
		};

		super(nodeVersions, baseDescription);
	}
}
