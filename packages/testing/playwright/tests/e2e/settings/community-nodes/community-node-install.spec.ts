import { test, expect } from '../../../../fixtures/base';

// Isolated container: community node install modifies the container filesystem
test.use({ capability: { env: { TEST_ISOLATION: 'community-node-install' } } });

test.describe(
	'Community node real installation',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test('should install a verified community node via API and list it', async ({ api }) => {
			const packageName = 'n8n-nodes-chatwork';

			// Install the community package via REST API
			const installResponse = await api.request.post('/rest/community-packages', {
				data: { name: packageName },
			});

			expect(installResponse.ok()).toBeTruthy();
			const installResult = await installResponse.json();
			expect(installResult.data.packageName).toBe(packageName);
			expect(installResult.data.installedNodes.length).toBeGreaterThan(0);

			// Capture the installed node type name for verification
			const installedNodeType = installResult.data.installedNodes[0].type;

			// Verify the package appears in the installed list
			const listResponse = await api.request.get('/rest/community-packages');
			expect(listResponse.ok()).toBeTruthy();
			const listResult = await listResponse.json();
			const installed = listResult.data.find(
				(pkg: { packageName: string }) => pkg.packageName === packageName,
			);
			expect(installed).toBeDefined();
			expect(installed.installedVersion).toBeTruthy();

			// Verify the node type is registered and available in the node types registry
			const nodeTypesResponse = await api.request.get('/types/nodes.json');
			expect(nodeTypesResponse.ok()).toBeTruthy();
			const nodeTypes: Array<{ name: string }> = await nodeTypesResponse.json();
			const registeredNode = nodeTypes.find((node) => node.name === installedNodeType);
			expect(
				registeredNode,
				`Node type "${installedNodeType}" should be in the types registry`,
			).toBeDefined();

			// Cleanup: uninstall the package
			const deleteResponse = await api.request.delete(
				`/rest/community-packages?name=${packageName}`,
			);
			expect(deleteResponse.ok()).toBeTruthy();
		});
	},
);
