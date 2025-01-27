import { Service } from '@n8n/di';
import { LazyPackageDirectoryLoader } from 'n8n-core';
import type {
	ICredentialType,
	INodeType,
	IVersionedNodeType,
	KnownNodesAndCredentials,
	LoadedClass,
} from 'n8n-workflow';

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
		return this.loader.getCredential(credentialType);
	}

	getNode(fullNodeType: string): LoadedClass<INodeType | IVersionedNodeType> {
		const nodeType = fullNodeType.split('.')[1];
		return this.loader.getNode(nodeType);
	}
}
