import { Service } from '@n8n/di';
import { LazyPackageDirectoryLoader } from 'n8n-core';
import type {
	ICredentialType,
	INodeType,
	IVersionedNodeType,
	KnownNodesAndCredentials,
	LoadedClass,
	LoadingDetails,
} from 'n8n-workflow';

/** This rewrites the nodes/credentials source path to load the typescript code instead of the compiled javascript code */
const fixSourcePath = (loadInfo: LoadingDetails) => {
	if (!loadInfo) return;
	loadInfo.sourcePath = loadInfo.sourcePath.replace(/^dist\//, './').replace(/\.js$/, '.ts');
};

@Service()
export class LoadNodesAndCredentials {
	private loader: LazyPackageDirectoryLoader;

	readonly known: KnownNodesAndCredentials = { nodes: {}, credentials: {} };

	constructor(baseDir: string) {
		this.loader = new LazyPackageDirectoryLoader(baseDir);
	}

	async init() {
		await this.loader.loadAll();
		this.known.credentials = this.loader.known.credentials;
		this.known.nodes = this.loader.known.nodes;
	}

	recognizesCredential(credentialType: string): boolean {
		return credentialType in this.known.credentials;
	}

	getCredential(credentialType: string): LoadedClass<ICredentialType> {
		fixSourcePath(this.known.credentials[credentialType]);
		return this.loader.getCredential(credentialType);
	}

	getNode(fullNodeType: string): LoadedClass<INodeType | IVersionedNodeType> {
		const nodeType = fullNodeType.split('.')[1];
		fixSourcePath(this.known.nodes[nodeType]);
		return this.loader.getNode(nodeType);
	}
}
