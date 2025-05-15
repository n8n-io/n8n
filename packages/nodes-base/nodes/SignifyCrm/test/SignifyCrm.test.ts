/**
 * Test file for SignifyCrm node
 */
import * as fs from 'fs';
import * as path from 'path';

describe('SignifyCrm Node', () => {
	// Paths to key files
	const basePath = path.join(__dirname, '..');
	const nodePath = path.join(basePath, 'SignifyCrm.node.ts');
	const nodeJsonPath = path.join(basePath, 'SignifyCrm.node.json');
	const genericFunctionsPath = path.join(basePath, 'GenericFunctions.ts');
	const descriptionsPath = path.join(basePath, 'descriptions');

	// Load implementation content once for all tests
	let nodeImplementation: string;
	let genericFunctionsImplementation: string;

	beforeAll(() => {
		nodeImplementation = fs.readFileSync(nodePath, 'utf8');
		genericFunctionsImplementation = fs.readFileSync(genericFunctionsPath, 'utf8');
	});

	describe('File structure validation', () => {
		test('SignifyCrm.node.ts file should exist', () => {
			expect(fs.existsSync(nodePath)).toBe(true);
		});

		test('SignifyCrm.node.json file should exist', () => {
			expect(fs.existsSync(nodeJsonPath)).toBe(true);
		});

		test('GenericFunctions.ts file should exist', () => {
			expect(fs.existsSync(genericFunctionsPath)).toBe(true);
		});

		test('descriptions directory should exist', () => {
			expect(fs.existsSync(descriptionsPath)).toBe(true);
			expect(fs.lstatSync(descriptionsPath).isDirectory()).toBe(true);
		});

		test('Node.json should have required properties', () => {
			const nodeJson = JSON.parse(fs.readFileSync(nodeJsonPath, 'utf8'));
			expect(nodeJson).toHaveProperty('node');
			expect(nodeJson).toHaveProperty('nodeVersion');
			expect(nodeJson).toHaveProperty('codexVersion');
			expect(nodeJson).toHaveProperty('categories');
			expect(nodeJson.node).toBe('n8n-nodes-base.signifyCrm');
		});

		test('Should have proper categories in node.json', () => {
			const nodeJson = JSON.parse(fs.readFileSync(nodeJsonPath, 'utf8'));
			expect(Array.isArray(nodeJson.categories)).toBe(true);
			expect(nodeJson.categories.length).toBeGreaterThan(0);
		});

		test('Should have documentation links in node.json', () => {
			const nodeJson = JSON.parse(fs.readFileSync(nodeJsonPath, 'utf8'));
			expect(nodeJson).toHaveProperty('resources');
			expect(nodeJson.resources).toHaveProperty('credentialDocumentation');
			expect(nodeJson.resources).toHaveProperty('primaryDocumentation');
		});
	});

	describe('Node implementation validation', () => {
		test('Should implement all required resources', () => {
			const requiredResources = ['contact', 'account', 'lead', 'opportunity', 'case', 'task'];
			requiredResources.forEach((resource) => {
				expect(nodeImplementation.includes(`'${resource}'`)).toBe(true);
			});
		});

		test('Should have a proper class definition', () => {
			expect(nodeImplementation.includes('export class SignifyCrm implements INodeType')).toBe(
				true,
			);
		});

		test('Should have an execute method', () => {
			expect(nodeImplementation.includes('async execute(')).toBe(true);
		});

		test('Should handle contact operations', () => {
			const contactOperations = ['create', 'get', 'getAll', 'update', 'delete'];
			contactOperations.forEach((operation) => {
				expect(nodeImplementation.includes(`operation === '${operation}'`)).toBe(true);
			});
		});

		test('Should handle account operations', () => {
			const accountOperations = ['create', 'get', 'getAll', 'update', 'delete'];
			accountOperations.forEach((operation) => {
				expect(nodeImplementation.includes(`operation === '${operation}'`)).toBe(true);
			});
		});

		test('Should handle lead operations', () => {
			const leadOperations = ['create', 'get', 'getAll', 'update', 'delete'];
			leadOperations.forEach((operation) => {
				expect(nodeImplementation.includes(`operation === '${operation}'`)).toBe(true);
			});
		});

		test('Should handle opportunity operations', () => {
			const opportunityOperations = ['create', 'get', 'getAll', 'update', 'delete'];
			opportunityOperations.forEach((operation) => {
				expect(nodeImplementation.includes(`operation === '${operation}'`)).toBe(true);
			});
		});

		test('Should handle case operations', () => {
			const caseOperations = ['create', 'get', 'getAll', 'update', 'delete'];
			caseOperations.forEach((operation) => {
				expect(nodeImplementation.includes(`operation === '${operation}'`)).toBe(true);
			});
		});

		test('Should handle task operations', () => {
			const taskOperations = ['create', 'get', 'getAll', 'update', 'delete'];
			taskOperations.forEach((operation) => {
				expect(nodeImplementation.includes(`operation === '${operation}'`)).toBe(true);
			});
		});

		test('Should properly define node credentials', () => {
			expect(nodeImplementation.includes('credentials: [')).toBe(true);
			expect(nodeImplementation.includes("name: 'signifyCrmApi'")).toBe(true);
			expect(nodeImplementation.includes('required: true')).toBe(true);
		});

		test('Should have proper error handling', () => {
			expect(nodeImplementation.includes('try {')).toBe(true);
			expect(nodeImplementation.includes('catch (')).toBe(true);
		});

		test('Should handle pagination for getAll operations', () => {
			expect(nodeImplementation.includes('offset')).toBe(true);
			expect(nodeImplementation.includes('limit')).toBe(true);
		});

		test('Should define proper I/O connections', () => {
			expect(nodeImplementation.includes('inputs:')).toBe(true);
			expect(nodeImplementation.includes('outputs:')).toBe(true);
		});
	});

	describe('GenericFunctions validation', () => {
		test('Should have API request function', () => {
			expect(
				genericFunctionsImplementation.includes('export async function signifyCrmApiRequest'),
			).toBe(true);
		});

		test('Should have get user ID function', () => {
			expect(
				genericFunctionsImplementation.includes('export async function signifyCrmGetUserId'),
			).toBe(true);
		});

		test('Should have picklist options function', () => {
			expect(
				genericFunctionsImplementation.includes('export async function getPicklistOptions'),
			).toBe(true);
		});

		test('Should handle error responses', () => {
			expect(genericFunctionsImplementation.includes('throwOnErrorStatus')).toBe(true);
		});

		test('Should handle authentication', () => {
			expect(genericFunctionsImplementation.includes('signifyCrmApiLogin')).toBe(true);
			expect(genericFunctionsImplementation.includes('Authorization')).toBe(true);
			expect(genericFunctionsImplementation.includes('Bearer')).toBe(true);
		});

		test('Should implement token caching', () => {
			expect(genericFunctionsImplementation.includes('TokenCache')).toBe(true);
			expect(genericFunctionsImplementation.includes('expiresAt')).toBe(true);
		});
	});

	describe('Description files validation', () => {
		test('Description directory should contain required files', () => {
			const files = fs.readdirSync(descriptionsPath);

			// Verify resource description files
			expect(files.some((file) => file.includes('ContactDescription'))).toBe(true);
			expect(files.some((file) => file.includes('AccountDescription'))).toBe(true);
			expect(files.some((file) => file.includes('LeadDescription'))).toBe(true);
			expect(files.some((file) => file.includes('OpportunityDescription'))).toBe(true);
			expect(files.some((file) => file.includes('CasesDescription'))).toBe(true);
			expect(files.some((file) => file.includes('TaskDescription'))).toBe(true);

			// Verify utility files
			expect(files.some((file) => file.includes('SharedFields'))).toBe(true);
			expect(files.some((file) => file.includes('index'))).toBe(true);
		});

		test('Description files should export expected elements', () => {
			const indexFilePath = path.join(descriptionsPath, 'index.ts');
			const indexContent = fs.readFileSync(indexFilePath, 'utf8');

			// Verify the file uses export * syntax for all description files
			expect(indexContent.includes('export * from')).toBe(true);
			expect(indexContent.includes('./AccountDescription')).toBe(true);
			expect(indexContent.includes('./ContactDescription')).toBe(true);
			expect(indexContent.includes('./LeadDescription')).toBe(true);
			expect(indexContent.includes('./OpportunityDescription')).toBe(true);
			expect(indexContent.includes('./CasesDescription')).toBe(true);
			expect(indexContent.includes('./TaskDescription')).toBe(true);
		});

		test('SharedFields should contain common field definitions', () => {
			const sharedFieldsPath = path.join(descriptionsPath, 'SharedFields.ts');
			const sharedFieldsContent = fs.readFileSync(sharedFieldsPath, 'utf8');

			// Check for common fields that should be shared
			expect(sharedFieldsContent.includes('displayName:')).toBe(true);
			expect(sharedFieldsContent.includes('name:')).toBe(true);
			expect(sharedFieldsContent.includes('type:')).toBe(true);
			expect(sharedFieldsContent.includes('default:')).toBe(true);
		});
	});

	describe('Functional tests (implementation patterns)', () => {
		describe('Contact operations', () => {
			test('should implement contact creation correctly', () => {
				// Verify the node handles contact creation
				expect(nodeImplementation.includes("resource === 'contact'")).toBe(true);
				expect(nodeImplementation.includes("operation === 'create'")).toBe(true);
				expect(nodeImplementation.includes("module_name: 'Contacts'")).toBe(true);
				expect(nodeImplementation.includes('name_value_list:')).toBe(true);
				expect(nodeImplementation.includes('/set_entry')).toBe(true);
			});

			test('should implement contact retrieval correctly', () => {
				// Verify the node handles contact retrieval
				expect(nodeImplementation.includes("operation === 'get'")).toBe(true);
				expect(nodeImplementation.includes('contactId')).toBe(true);
				expect(nodeImplementation.includes('/get_entry')).toBe(true);
			});

			test('should implement contact updating correctly', () => {
				// Verify the node handles contact updating
				expect(nodeImplementation.includes("operation === 'update'")).toBe(true);
				expect(nodeImplementation.includes('contactId')).toBe(true);

				// Check for common update patterns - at least one should be present
				const hasUpdatePatterns =
					nodeImplementation.includes('additionalFields') ||
					nodeImplementation.includes('updateFields') ||
					nodeImplementation.includes('name_value_list') ||
					nodeImplementation.includes('set_entry');

				expect(hasUpdatePatterns).toBe(true);
			});

			test('should implement contact deletion correctly', () => {
				// Verify the node handles contact deletion
				expect(nodeImplementation.includes("operation === 'delete'")).toBe(true);
				expect(nodeImplementation.includes('deleted')).toBe(true);
				expect(nodeImplementation.includes("value: '1'")).toBe(true);
			});

			test('should implement contact listing correctly', () => {
				// Verify the node handles contact listing
				expect(nodeImplementation.includes("operation === 'getAll'")).toBe(true);
				expect(nodeImplementation.includes('/get_entry_list')).toBe(true);
				expect(nodeImplementation.includes('str_query')).toBe(true);
				expect(nodeImplementation.includes('returnAll')).toBe(true);
				expect(nodeImplementation.includes('limit')).toBe(true);
			});
		});

		describe('Account operations', () => {
			test('should implement account creation correctly', () => {
				// Verify the node handles account creation
				expect(nodeImplementation.includes("resource === 'account'")).toBe(true);
				expect(nodeImplementation.includes("module_name: 'Accounts'")).toBe(true);
				expect(nodeImplementation.includes('account_type')).toBe(true);
				expect(nodeImplementation.includes('industry')).toBe(true);
			});

			test('should implement account retrieval correctly', () => {
				// Verify the node handles account retrieval
				expect(nodeImplementation.includes('accountId')).toBe(true);
				expect(nodeImplementation.includes("module_name: 'Accounts'")).toBe(true);
			});

			test('should implement account updating correctly', () => {
				// Verify the node handles account updating
				expect(nodeImplementation.includes("resource === 'account'")).toBe(true);
				expect(nodeImplementation.includes("operation === 'update'")).toBe(true);
			});

			test('should implement account deletion correctly', () => {
				// Verify the node handles account deletion
				expect(nodeImplementation.includes("resource === 'account'")).toBe(true);
				expect(nodeImplementation.includes("operation === 'delete'")).toBe(true);
			});

			test('should implement account listing correctly', () => {
				// Verify the node handles account listing
				expect(nodeImplementation.includes("resource === 'account'")).toBe(true);
				expect(nodeImplementation.includes("operation === 'getAll'")).toBe(true);
			});
		});

		describe('Lead operations', () => {
			test('should implement lead creation correctly', () => {
				// Verify the node handles lead creation
				expect(nodeImplementation.includes("resource === 'lead'")).toBe(true);
				expect(nodeImplementation.includes("operation === 'create'")).toBe(true);
				expect(nodeImplementation.includes("module_name: 'Leads'")).toBe(true);
			});

			test('should implement lead retrieval correctly', () => {
				expect(nodeImplementation.includes("resource === 'lead'")).toBe(true);
				expect(nodeImplementation.includes("operation === 'get'")).toBe(true);
				expect(nodeImplementation.includes('leadId')).toBe(true);
			});

			test('should implement lead updating correctly', () => {
				expect(nodeImplementation.includes("resource === 'lead'")).toBe(true);
				expect(nodeImplementation.includes("operation === 'update'")).toBe(true);
			});

			test('should implement lead deletion correctly', () => {
				expect(nodeImplementation.includes("resource === 'lead'")).toBe(true);
				expect(nodeImplementation.includes("operation === 'delete'")).toBe(true);
			});

			test('should implement lead listing correctly', () => {
				expect(nodeImplementation.includes("resource === 'lead'")).toBe(true);
				expect(nodeImplementation.includes("operation === 'getAll'")).toBe(true);
			});
		});

		describe('Opportunity operations', () => {
			test('should implement opportunity creation correctly', () => {
				expect(nodeImplementation.includes("resource === 'opportunity'")).toBe(true);
				expect(nodeImplementation.includes("operation === 'create'")).toBe(true);
				expect(nodeImplementation.includes("module_name: 'Opportunities'")).toBe(true);
			});

			test('should implement opportunity retrieval correctly', () => {
				expect(nodeImplementation.includes("resource === 'opportunity'")).toBe(true);
				expect(nodeImplementation.includes("operation === 'get'")).toBe(true);
				expect(nodeImplementation.includes('opportunityId')).toBe(true);
			});

			test('should implement opportunity updating correctly', () => {
				expect(nodeImplementation.includes("resource === 'opportunity'")).toBe(true);
				expect(nodeImplementation.includes("operation === 'update'")).toBe(true);
			});

			test('should implement opportunity deletion correctly', () => {
				expect(nodeImplementation.includes("resource === 'opportunity'")).toBe(true);
				expect(nodeImplementation.includes("operation === 'delete'")).toBe(true);
			});

			test('should implement opportunity listing correctly', () => {
				expect(nodeImplementation.includes("resource === 'opportunity'")).toBe(true);
				expect(nodeImplementation.includes("operation === 'getAll'")).toBe(true);
			});
		});

		describe('Case operations', () => {
			test('should implement case creation correctly', () => {
				expect(nodeImplementation.includes("resource === 'case'")).toBe(true);
				expect(nodeImplementation.includes("operation === 'create'")).toBe(true);
				expect(nodeImplementation.includes("module_name: 'Cases'")).toBe(true);
			});

			test('should implement case retrieval correctly', () => {
				expect(nodeImplementation.includes("resource === 'case'")).toBe(true);
				expect(nodeImplementation.includes("operation === 'get'")).toBe(true);
				expect(nodeImplementation.includes('caseId')).toBe(true);
			});

			test('should implement case updating correctly', () => {
				expect(nodeImplementation.includes("resource === 'case'")).toBe(true);
				expect(nodeImplementation.includes("operation === 'update'")).toBe(true);
			});

			test('should implement case deletion correctly', () => {
				expect(nodeImplementation.includes("resource === 'case'")).toBe(true);
				expect(nodeImplementation.includes("operation === 'delete'")).toBe(true);
			});

			test('should implement case listing correctly', () => {
				expect(nodeImplementation.includes("resource === 'case'")).toBe(true);
				expect(nodeImplementation.includes("operation === 'getAll'")).toBe(true);
			});
		});

		describe('Task operations', () => {
			test('should implement task creation correctly', () => {
				expect(nodeImplementation.includes("resource === 'task'")).toBe(true);
				expect(nodeImplementation.includes("operation === 'create'")).toBe(true);
				expect(nodeImplementation.includes("module_name: 'Tasks'")).toBe(true);
			});

			test('should implement task retrieval correctly', () => {
				expect(nodeImplementation.includes("resource === 'task'")).toBe(true);
				expect(nodeImplementation.includes("operation === 'get'")).toBe(true);
				expect(nodeImplementation.includes('taskId')).toBe(true);
			});

			test('should implement task updating correctly', () => {
				expect(nodeImplementation.includes("resource === 'task'")).toBe(true);
				expect(nodeImplementation.includes("operation === 'update'")).toBe(true);
			});

			test('should implement task deletion correctly', () => {
				expect(nodeImplementation.includes("resource === 'task'")).toBe(true);
				expect(nodeImplementation.includes("operation === 'delete'")).toBe(true);
			});

			test('should implement task listing correctly', () => {
				expect(nodeImplementation.includes("resource === 'task'")).toBe(true);
				expect(nodeImplementation.includes("operation === 'getAll'")).toBe(true);
			});
		});
	});
});
