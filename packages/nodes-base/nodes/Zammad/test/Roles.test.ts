/**
 * __tests__/ZammadCreateRole.spec.ts
 */

import { Zammad } from '../Zammad.node';
import * as GenericFunctions from '../GenericFunctions';
import { NodeOperationError } from 'n8n-workflow';

// Wir verwenden Jest-Mocks, um Aufrufe an das zammadApiRequest abzufangen.
jest.mock('../GenericFunctions', () => ({
	...jest.requireActual('../GenericFunctions'),
	zammadApiRequest: jest.fn(),
}));

describe('Zammad Node - Create Role', () => {
	const zammadNode = new Zammad();

	// Beispielhafte Rückgabe der API
	const mockApiResponse = {
		id: 123,
		name: 'Test Role',
		active: true,
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('Erstellt erfolgreich eine Rolle', async () => {
		// 1) zammadApiRequest so einstellen, dass es unsere mockApiResponse zurückgibt
		(GenericFunctions.zammadApiRequest as jest.Mock).mockResolvedValue(mockApiResponse);

		// 2) InputData simulieren: Wir tun so, als ob n8n 1 Item mit den Node-Parametern liefert
		const items = [
			{
				json: {},
			},
		];

		// 3) Wir faken `this`, damit wir `getNodeParameter` & `getInputData` aufrufen können
		const fakeThis: any = {
			getNodeParameter: (paramName: string, _itemIndex: number) => {
				// Wir geben die Resource und Operation zurück, die wir testen wollen.
				// Außerdem simulieren wir einen minimalen Parameter-Satz (name etc.).
				const map: Record<string, any> = {
					resource: 'role',
					operation: 'create',
					name: 'Test Role',
					additionalFields: {},
				};
				return map[paramName];
			},
			getInputData: () => items,
			helpers: {
				// Wichtig für die Konstruktion unserer Antwort
				returnJsonArray: (data: any) => (Array.isArray(data) ? data : [data]),
				constructExecutionMetaData: (data: any) => data,
			},
			continueOnFail: () => false,
		};

		// 4) Node ausführen
		const result = await zammadNode.execute.call(fakeThis);

		// 5) Erwartungen prüfen

		// 5a) Wurde `zammadApiRequest` aufgerufen?
		expect(GenericFunctions.zammadApiRequest).toHaveBeenCalledTimes(1);

		// 5b) Wurde die Rolle korrekt mit POST auf /roles erstellt?
		expect(GenericFunctions.zammadApiRequest).toHaveBeenCalledWith(
			expect.anything(), // `this`-Kontext
			'POST',
			'/roles',
			{ name: 'Test Role' }, // Body, den der Node erstellt
		);

		// 5c) Entspricht das zurückgelieferte Ergebnis der Mock-Antwort?
		expect(result).toBeDefined();
		expect(result[0][0].json).toEqual(mockApiResponse);
	});

	test('Fehler bei fehlendem Namen', async () => {
		// Wenn `getNodeParameter('name', i)` fehlt, sollte ein Fehler fliegen:
		const items = [
			{
				json: {},
			},
		];

		const fakeThis: any = {
			getNodeParameter: (paramName: string, _itemIndex: number) => {
				// Resource und Operation bleiben gleich, aber wir geben keinen "name" zurück.
				const map: Record<string, any> = {
					resource: 'role',
					operation: 'create',
					additionalFields: {},
				};
				return map[paramName];
			},
			getInputData: () => items,
			helpers: {
				returnJsonArray: (data: any) => (Array.isArray(data) ? data : [data]),
				constructExecutionMetaData: (data: any) => data,
			},
			continueOnFail: () => false,
		};

		await expect(zammadNode.execute.call(fakeThis)).rejects.toThrow(NodeOperationError);
	});
});
