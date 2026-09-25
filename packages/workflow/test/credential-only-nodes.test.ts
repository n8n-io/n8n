import { CREDENTIAL_ONLY_NODE_PREFIX } from '../src/constants';
import {
	getCredentialOnlyNodeCredentialType,
	getCredentialOnlyNodeTypeName,
	isCredentialOnlyNodeType,
} from '../src/credential-only-nodes';

describe('credential-only nodes', () => {
	it('recognises a generated node type name', () => {
		expect(isCredentialOnlyNodeType('n8n-creds-base.virusTotalApi')).toBe(true);
	});

	it('does not recognise a registered node type or the bare prefix', () => {
		expect(isCredentialOnlyNodeType('n8n-nodes-base.httpRequest')).toBe(false);
		expect(isCredentialOnlyNodeType(CREDENTIAL_ONLY_NODE_PREFIX)).toBe(false);
		expect(isCredentialOnlyNodeType('n8n-creds-baseX.virusTotalApi')).toBe(false);
	});

	it('round-trips a credential type through the generated name', () => {
		const nodeTypeName = getCredentialOnlyNodeTypeName('virusTotalApi');

		expect(nodeTypeName).toBe('n8n-creds-base.virusTotalApi');
		expect(getCredentialOnlyNodeCredentialType(nodeTypeName)).toBe('virusTotalApi');
	});
});
