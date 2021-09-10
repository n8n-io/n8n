import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType
} from 'n8n-workflow';

import { xentralRequestOldApi, xentralRequest } from './GenericFunctions';

function prepareBodyOldApi(body: IDataObject): IDataObject {
	for (const property in body) {
		if (typeof body[property] === 'object') {
			if (body[property] === null) {
				body[property] = '';
			} else {
				const subBody = body[property] as IDataObject;
				body[property] = prepareBodyOldApi(subBody);
			}
		} else if (typeof body[property] === 'boolean') {
			body[property] = body[property] ? '1' : '0';
		} else if (typeof body[property] === 'number') {
			body[property] = body[property]!.toString();
		}
	}
	return body;
}

export class Xentral implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Xentral',
		name: 'xentral',
		icon: 'file:xentral.png',
		group: ['transform'],
		version: 1,
		description: 'Xentral ERP Node',
		defaults: {
			name: 'Xentral',
			color: '#42b8c5'
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'xentral',
				required: true
			}
		],

		properties: [

			// ----------------------------------
			// 				DB Setting
			// ----------------------------------
			{
				displayName: 'Datenbank wählen',
				name: 'chooseDatabase',
				type: 'boolean',
				default: false,
				description: 'Wählen, falls Xentral multiDB Option genutzt wird.'
			},
			{
				displayName: 'Datenbankname',
				name: 'databaseName',
				type: 'string',
				displayOptions: {
					show: {
						chooseDatabase: [
							true,
						],
					},
				},
				required: true,
				default: '',
				description: 'Name der Datenbank.'
			},

			// ----------------------------------
			// 				Resources
			// ----------------------------------
			{
				displayName: 'Ressource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Auftrag(v1)',
						value: 'order'
					},
					{
						name: 'Adresse(v1/v2)',
						value: 'address'
					},
					{
						name: 'Rechnungsbeleg(v1)',
						value: 'rechnungen'
					},
					{
						name: 'Angebotsbeleg(v1)',
						value: 'angebote'
					},
					{
						name: 'Auftragsbeleg(v1)',
						value: 'auftraege'
					},
					{
						name: 'Lieferschein(v1)',
						value: 'lieferscheine'
					},
					{
						name: 'Gutschrift(v1)',
						value: 'gutschriften'
					},

				],
				default: 'order',
				description: 'Die Ressource mit der gearbeitet wird.'
			},

			// ----------------------------------
			// 				order
			// ----------------------------------
			{
				displayName: 'Vorgang',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['order']
					}
				},
				options: [
					{
						name: 'Erstellen',
						value: 'create',
						description: 'Auftrag erstellen.'
					},
					{
						name: 'Aktualisieren',
						value: 'update',
						description: 'Auftrag aktualisieren.'
					},
					{
						name: 'Abrufen',
						value: 'get',
						description: 'Auftrag abrufen.'
					}
				],
				default: 'create',
				description: 'Der Vorgang, der ausgeführt werden soll.'
			},

			// ----------------------------------
			//         order:create
			// ----------------------------------
			{
				displayName: 'Daten',
				name: 'data',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['order']
					}
				},
				default: '',
				required: true,
				description: 'Daten die übermittlet werden.'
			},

			// ----------------------------------
			//         order:update
			// ----------------------------------
			{
				displayName: 'Daten',
				name: 'data',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['update'],
						resource: ['order']
					}
				},
				default: '',
				required: true,
				description: 'Daten die übermittlet werden.',
			},

			// ----------------------------------
			//         order:get
			// ----------------------------------
			{
				displayName: 'Daten',
				name: 'data',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['get'],
						resource: ['order']
					}
				},
				default: '',
				required: true,
				description: 'Daten die übermittlet werden.'
			},

			// ----------------------------------
			//         address
			// ----------------------------------
			{
				displayName: 'Vorgang',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['address']
					}
				},
				options: [
					{
						name: 'Anlegen(v1)',
						value: 'create',
						description: 'Adresse anlegen.'
					},
					{
						name: 'Aktualisieren(v1)',
						value: 'update',
						description: 'Adresse aktualisieren.'
					},
					{
						name: 'Alle Abrufen(v2)',
						value: 'getAll',
						description: 'Alle Adressen abrufen.'
					},
					{
						name: 'Abrufen(v2)',
						value: 'getById',
						description: 'Adresse abrufen.'
					}
				],
				default: 'create',
				description: 'Der Vorgang, der ausgeführt werden soll.'
			},

			// ----------------------------------
			//         address: getById
			// ----------------------------------
			{
				displayName: 'ID',
				name: 'id',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['getById'],
						resource: ['address']
					}
				},
				default: 1,
				required: true,
				description: 'Adressen Id'
			},

			// ----------------------------------
			//         address: getAll
			// ----------------------------------
			{
				displayName: 'Abfrage Parameter',
				name: 'queryParameters',
				type: 'collection',
				description: 'Die Abfrage Parameter, nach denen gefiltert werden soll.',
				placeholder: 'Parameter hinzufügen',
				displayOptions: {
					show: {
						operation: ['getAll'],
						resource: ['address']
					},
				},
				default: {},
				options: [
					{
						displayName: 'Anzahl Ergebnisse',
						name: 'items',
						type: 'number',
						default: 20,
						description: 'Anzahl der Ergebnisse pro Seite. Maximum 1000.',
					},
					{
						displayName: 'Seitenzahl',
						name: 'page',
						type: 'number',
						default: 1,
						description: 'Seitenzahl',
					},
					{
						displayName: 'Projekt',
						name: 'projekt',
						type: 'number',
						default: 0,
						description: 'Suche nach bestimmter Projekt-ID (genaue Übereinstimmung).',
					},
					{
						displayName: 'Firma',
						name: 'firma',
						type: 'string',
						default: '0',
						description: 'Suche nach bestimmter Firmen-ID (genaue Übereinstimmung).',
					},
					{
						displayName: 'Rolle',
						name: 'rolle',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmter Rolle (Wert kunde oder lieferant).',
					},
					{
						displayName: 'Typ',
						name: 'typ',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Adresstyp (genaue Übereinstimmung).',
					},
					{
						displayName: 'Sprache',
						name: 'sprache',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmter Sprache (genaue Übereinstimmung).',
					},
					{
						displayName: 'Währung',
						name: 'waehrung',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Währungscode (genaue Übereinstimmung).',
					},
					{
						displayName: 'Land',
						name: 'land',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Ländercode (genaue Übereinstimmung).',
					},
					{
						displayName: 'Kundennummer',
						name: 'kundennummer',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmter Kundennummer (ungefähre Übereinstimmung).',
					},
					{
						displayName: 'Kundennummer gleicht',
						name: 'kundennummer_equals',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmter Kundennummer (genaue Übereinstimmung).',
					},
					{
						displayName: 'Kundennummer beginnt mit',
						name: 'kundennummer_startswith',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmter Kundennummer (Übereinstimmung am Anfang).',
					},
					{
						displayName: 'Kundennummer endet mit',
						name: 'kundennummer_endswith',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmter Kundennummer (Übereinstimmung am Ende).',
					},
					{
						displayName: 'Lieferantennummer',
						name: 'lieferantennummer',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmter Lieferantennummer (ungefähre Übereinstimmung).',
					},
					{
						displayName: 'Lieferantennummer gleicht',
						name: 'lieferantennummer_equals',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmter Lieferantennummer (genaue Übereinstimmung).',
					},
					{
						displayName: 'Lieferantennummer beginnt mit',
						name: 'lieferantennummer_startswith',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmter Lieferantennummer (Übereinstimmung am Anfang).',
					},
					{
						displayName: 'Lieferantennummer endet mit',
						name: 'lieferantennummer_endswith',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmter Lieferantennummer (Übereinstimmung am Ende).',
					},
					{
						displayName: 'Mitarbeiternummer',
						name: 'mitarbeiternummer',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmter Mitarbeiternummer (ungefähre Übereinstimmung).',
					},
					{
						displayName: 'Mitarbeiternummer gleicht',
						name: 'mitarbeiternummer_equals',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmter Mitarbeiternummer (genaue Übereinstimmung).',
					},
					{
						displayName: 'Mitarbeiternummer beginnt mit',
						name: 'mitarbeiternummer_startswith',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmter Mitarbeiternummer (Übereinstimmung am Anfang).',
					},
					{
						displayName: 'Mitarbeiternummer endet mit',
						name: 'mitarbeiternummer_endswith',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmter Mitarbeiternummer (Übereinstimmung am Ende).',
					},
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmter E-Mail-Adresse (ungefähre Übereinstimmung).',
					},
					{
						displayName: 'Email gleicht',
						name: 'email_equals',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmter E-Mail-Adresse (genaue Übereinstimmung).',
					},
					{
						displayName: 'Email beginnt mit',
						name: 'email_startswith',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmter E-Mail-Adresse (Übereinstimmung am Anfang).',
					},
					{
						displayName: 'Email endet mit',
						name: 'email_endswith',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmter E-Mail-Adresse (Übereinstimmung am Ende).',
					},
					{
						displayName: 'Sortierung',
						name: 'sort',
						type: 'string',
						default: '',
						description: 'Sortierung (Beispiel: sort = name,-kundennummer) Verfügbare Felder: name, kundennummer, lieferantennummer, mitarbeiternummer.',
					},
					{
						displayName: 'Freifeld 1',
						name: 'freifeld1',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Wert im Freifeld1 (ungefähre Übereinstimmung).',
					},
					{
						displayName: 'Freifeld 2',
						name: 'freifeld2',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Wert im Freifeld2 (ungefähre Übereinstimmung).',
					},
					{
						displayName: 'Freifeld 3',
						name: 'freifeld3',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Wert im Freifeld3 (ungefähre Übereinstimmung).',
					},
					{
						displayName: 'Freifeld 4',
						name: 'freifeld4',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Wert im Freifeld4 (ungefähre Übereinstimmung).',
					},
					{
						displayName: 'Freifeld 5',
						name: 'freifeld5',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Wert im Freifeld5 (ungefähre Übereinstimmung).',
					},
					{
						displayName: 'Freifeld 6',
						name: 'freifeld6',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Wert im Freifeld6 (ungefähre Übereinstimmung).',
					},
					{
						displayName: 'Freifeld 7',
						name: 'freifeld7',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Wert im Freifeld7 (ungefähre Übereinstimmung).',
					},
					{
						displayName: 'Freifeld 8',
						name: 'freifeld8',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Wert im Freifeld8 (ungefähre Übereinstimmung).',
					},
					{
						displayName: 'Freifeld 9',
						name: 'freifeld9',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Wert im Freifeld9 (ungefähre Übereinstimmung).',
					},
					{
						displayName: 'Freifeld 10',
						name: 'freifeld10',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Wert im Freifeld10 (ungefähre Übereinstimmung).',
					},
					{
						displayName: 'Freifeld 1 gleich',
						name: 'freifeld1_equals',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Wert im Freifeld1 (genaue Übereinstimmung).',
					},
					{
						displayName: 'Freifeld 2 gleich',
						name: 'freifeld2_equals',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Wert im Freifeld2 (genaue Übereinstimmung).',
					},
					{
						displayName: 'Freifeld 3 gleich',
						name: 'freifeld3_equals',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Wert im Freifeld3 (genaue Übereinstimmung).',
					},
					{
						displayName: 'Freifeld 4 gleich',
						name: 'freifeld4_equals',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Wert im Freifeld4 (genaue Übereinstimmung).',
					},
					{
						displayName: 'Freifeld 5 gleich',
						name: 'freifeld5_equals',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Wert im Freifeld5 (genaue Übereinstimmung).',
					},
					{
						displayName: 'Freifeld 6 gleich',
						name: 'freifeld6_equals',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Wert im Freifeld6 (genaue Übereinstimmung).',
					},
					{
						displayName: 'Freifeld 7 gleich',
						name: 'freifeld7_equals',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Wert im Freifeld7 (genaue Übereinstimmung).',
					},
					{
						displayName: 'Freifeld 8 gleich',
						name: 'freifeld8_equals',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Wert im Freifeld8 (genaue Übereinstimmung).',
					},
					{
						displayName: 'Freifeld 9 gleich',
						name: 'freifeld9_equals',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Wert im Freifeld9 (genaue Übereinstimmung).',
					},
					{
						displayName: 'Freifeld 10 gleich',
						name: 'freifeld10_equals',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Wert im Freifeld10 (genaue Übereinstimmung).',
					},
				]
			},

			// ----------------------------------
			//         address: create
			// ----------------------------------

			{
				displayName: 'Daten',
				name: 'data',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['address']
					}
				},
				default: '',
				required: true,
				description: 'Daten die übermittlet werden.'
			},


			// ----------------------------------
			//         address: update
			// ----------------------------------
			{
				displayName: 'ID',
				name: 'id',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['update'],
						resource: ['address']
					}
				},
				default: 1,
				required: true,
				description: 'ID der zu aktualisierenden Adresse.'
			},
			{
				displayName: 'Daten',
				name: 'data',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['update'],
						resource: ['address']
					}
				},
				default: 1,
				required: true,
				description: 'Daten die übermittlet werden.'
			},

			// ----------------------------------
			// 				belege
			// ----------------------------------
			{
				displayName: 'Vorgang',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['rechnungen', 'angebote', 'auftraege', 'lieferscheine', 'gutschriften']
					}
				},
				options: [
					{
						name: 'Alle abrufen',
						value: 'getAll',
						description: 'Belegliste abrufen'
					},
					{
						name: 'Abrufen',
						value: 'getById',
						description: 'Einzelnen Beleg abrufen'
					},

				],
				default: 'getById',
				description: 'Der Vorgang, der ausgeführt werden soll.'
			},

			// ----------------------------------
			//         belege: getById
			// ----------------------------------
			{
				displayName: 'ID',
				name: 'id',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['getById'],
						resource: ['rechnungen', 'angebote', 'auftraege', 'lieferscheine', 'gutschriften']
					}
				},
				default: 1,
				required: true,
				description: 'Rechnungs ID'
			},

			// ----------------------------------
			//         belege: getAll
			// ----------------------------------
			{
				displayName: 'Abfrage Parameter',
				name: 'queryParameters',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['getAll'],
						resource: ['rechnungen', 'angebote', 'auftraege', 'lieferscheine', 'gutschriften']
					}
				},
				default: {},
				required: false,
				description: 'Die Abfrage Parameter, nach denen gefiltert werden soll.',
				placeholder: 'Parameter hinzufügen',
				options: [
					{
						displayName: 'Seitenzahl',
						name: 'page',
						type: 'number',
						default: 1,
						description: 'Seitenzahl, maximal: 1000'
					},
					{
						displayName: 'Anzahl Ergebnisse',
						name: 'items',
						type: 'number',
						default: 20,
						description: 'Anzahl der Ergebnisse pro Seite, maximal: 1000'
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'string',
						default: 'angelegt',
						description: 'Suche nach Rechnungs-Status (genaue Übereinstimmung)'
					},
					{
						displayName: 'Belegnummer',
						name: 'belegnr',
						type: 'string',
						default: '',
						description: 'Suche nach Belegnummer (ungefähre Übereinstimmung)'
					},
					{
						displayName: 'Belegnummer Gleicht',
						name: 'belegnr_equals',
						type: 'string',
						default: '',
						description: 'Suche nach Belegnummer (genaue Übereinstimmung)'
					},
					{
						displayName: 'Belegnummer beginnt mit',
						name: 'belegnr_startswith',
						type: 'string',
						default: '',
						description: 'Suche nach Belegnummer (Übereinstimmung am Anfang)'
					},
					{
						displayName: 'Belegnummer endet mit',
						name: 'belegnr_endswith',
						type: 'string',
						default: '',
						description: 'Suche nach Belegnummer (Übereinstimmung am Ende)'
					},
					{
						displayName: 'Kundennummer',
						name: 'kundennummer',
						type: 'string',
						default: '',
						description: 'Suche nach Kundennummer (ungefähre Übereinstimmung)'
					},
					{
						displayName: 'Kundennummer Gleicht',
						name: 'kundennummer_equals',
						type: 'string',
						default: '',
						description: 'Suche nach Kundennummer (genaue Übereinstimmung)'
					},
					{
						displayName: 'Kundennummer beginnt mit',
						name: 'kundennummer_startswith',
						type: 'string',
						default: '',
						description: 'Suche nach Kundennummer (Übereinstimmung am Anfang)'
					},
					{
						displayName: 'Kundennummer endet mit',
						name: 'kundennummer_endswith',
						type: 'string',
						default: '',
						description: 'Suche nach Kundennummer (Übereinstimmung am Ende)'
					},
					{
						displayName: 'Datum',
						name: 'datum',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Belegdatum (genaue Übereinstimmung)'
					},
					{
						displayName: 'Datum größer Suchwert',
						name: 'datum_gt',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Belegdatum (Datum größer Suchwert)'
					},
					{
						displayName: 'Datum größer, gleich Suchwert',
						name: 'datum_gte',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Belegdatum (Datum größer gleich Suchwert)'
					},
					{
						displayName: 'Datum kleiner Suchwert',
						name: 'datum_lt',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Belegdatum (Datum kleiner Suchwert)'
					},
					{
						displayName: 'Datum kleiner, gleich Suchwert',
						name: 'datum_lte',
						type: 'string',
						default: '',
						description: 'Suche nach bestimmtem Belegdatum (Datum kleiner gleich Suchwert)'
					},
					{
						displayName: 'Auftrag',
						name: 'auftrag',
						type: 'string',
						default: '',
						description: 'Rechnungen nach Auftragsnummer filtern (genaue Übereinstimmung)'
					},
					{
						displayName: 'Auftrag ID',
						name: 'auftragid',
						type: 'number',
						default: 1,
						description: 'Rechnungen nach Auftrags-ID filtern (genaue Übereinstimmung)'
					},
					{
						displayName: 'Projekt',
						name: 'projekt',
						type: 'string',
						default: '',
						description: 'Rechnungen eines bestimmten Projekt filtern'
					},
					{
						displayName: 'Sortieren',
						name: 'sort',
						type: 'string',
						default: 'sort=belegnr',
						description: 'Sortierung (Beispiel: sort=belegnr Verfügbare Felder: belegnr, datum'
					},
					{
						displayName: 'Einschließen',
						name: 'include',
						type: 'string',
						default: '',
						description: 'Unter-Ressourcen in Ressource einbinden (Beispiel: include=positionen) Verfügbare Includes: positionen, protokoll'
					},
				]
			}
		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		let resource: string;
		let operation: string;

		// For Body
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		let requestMethod: string;
		let endpoint: string;

		let usesOldApi = false;

		for (let i = 0; i < items.length; i++) {
			requestMethod = 'GET';
			endpoint = '';
			body = {} as IDataObject;
			qs = {} as IDataObject;

			resource = this.getNodeParameter('resource', 0) as string;
			operation = this.getNodeParameter('operation', 0) as string;

			if (resource === 'order') {
				if (operation === 'create') {
					// ----------------------------------
					//         create
					// ----------------------------------
					requestMethod = 'POST';
					endpoint = '/api/index.php/AuftragCreate';

					usesOldApi = true;
					body = {
						data: this.getNodeParameter('data', i) as object
					} as IDataObject;
					body = prepareBodyOldApi(body);
				} else if (operation === 'update') {
					// ----------------------------------
					//         update
					// ----------------------------------
					requestMethod = 'POST';
					endpoint = '/api/index.php/AuftragEdit';

					usesOldApi = true;

					body = {
						data: this.getNodeParameter('data', i) as object
					} as IDataObject;
					body = prepareBodyOldApi(body);
				} else if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------
					requestMethod = 'POST';
					endpoint = '/api/index.php/AuftragGet';

					usesOldApi = true;

					body = {
						data: this.getNodeParameter('data', i) as object
					} as IDataObject;
					body = prepareBodyOldApi(body);
				} else {
					throw new Error(`The operation '${operation}' is not known!`);
				}
			} else if (resource === 'address') {
				// ----------------------------------
				//         addresses
				// ----------------------------------
				if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------
					requestMethod = 'GET';

					usesOldApi = false;

					const queryParameters = this.getNodeParameter('queryParameters', i) as IDataObject;
					for (const key of Object.keys(queryParameters)) {
						qs[key] = queryParameters[key];
					}

					endpoint = '/api/v2/adressen';
				} else if (operation === 'getById') {
					// ----------------------------------
					//         getByID
					// ----------------------------------
					requestMethod = 'GET';

					usesOldApi = false;

					const id = this.getNodeParameter('id', i) as number;
					endpoint = `/api/v2/adressen/${id}`;
				} else if (operation === 'create') {
					// ----------------------------------
					//         create
					// ----------------------------------
					requestMethod = 'POST';
					endpoint = '/api/v1/adressen';

					usesOldApi = true;
					body = this.getNodeParameter('data', i) as IDataObject;
					body = prepareBodyOldApi(body);
					
				} else if (operation === 'update') {
					// ----------------------------------
					//         update
					// ----------------------------------
					requestMethod = 'PUT';
					const id = this.getNodeParameter('id', i) as number;
					endpoint = `/api/v1/adressen/${id}`;

					usesOldApi = true;
					body = this.getNodeParameter('data', i) as IDataObject;
					body = prepareBodyOldApi(body);
					
				}
			} else if (resource === 'rechnungen') {
				// ----------------------------------
				//         rechnungen
				// ----------------------------------

				if (operation === 'getById') {
					// ----------------------------------
					//         getByID
					// ----------------------------------
					requestMethod = 'GET';

					const id = this.getNodeParameter('id', i) as number;

					endpoint = `/api/v1/belege/rechnungen/${id}`;

					/* } else if (operation === 'delete') {
						// ----------------------------------
						//         delete
						// ----------------------------------
						requestMethod = 'DELETE';
	
						const id = this.getNodeParameter('id', i) as number;
	
						endpoint = `/api/v1/belege/rechnungen/${id}`;
	 				*/
				} else if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------
					requestMethod = 'GET';

					const queryParameters = this.getNodeParameter('queryParameters', i) as IDataObject;

					for (const key of Object.keys(queryParameters)) {
						qs[key] = queryParameters[key];
					}

					endpoint = '/api/v1/belege/rechnungen';
				}

			} else if (resource === 'angebote') {
				// ----------------------------------
				//         angebote
				// ----------------------------------

				if (operation === 'getById') {
					// ----------------------------------
					//         getByID
					// ----------------------------------
					requestMethod = 'GET';

					const id = this.getNodeParameter('id', i) as number;

					endpoint = `/api/v1/belege/angebote/${id}`;

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------
					requestMethod = 'GET';

					const queryParameters = this.getNodeParameter('queryParameters', i) as IDataObject;

					for (const key of Object.keys(queryParameters)) {
						qs[key] = queryParameters[key];
					}

					endpoint = '/api/v1/belege/angebote';
				}

			} else if (resource === 'auftraege') {
				// ----------------------------------
				//         auftraege
				// ----------------------------------

				if (operation === 'getById') {
					// ----------------------------------
					//         getByID
					// ----------------------------------
					requestMethod = 'GET';

					const id = this.getNodeParameter('id', i) as number;

					endpoint = `/api/v1/belege/auftraege/${id}`;

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------
					requestMethod = 'GET';

					const queryParameters = this.getNodeParameter('queryParameters', i) as IDataObject;

					for (const key of Object.keys(queryParameters)) {
						qs[key] = queryParameters[key];
					}

					endpoint = '/api/v1/belege/auftraege';
				}

			} else if (resource === 'lieferscheine') {
				// ----------------------------------
				//         lieferscheine
				// ----------------------------------

				if (operation === 'getById') {
					// ----------------------------------
					//         getByID
					// ----------------------------------
					requestMethod = 'GET';

					const id = this.getNodeParameter('id', i) as number;

					endpoint = `/api/v1/belege/lieferscheine/${id}`;

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------
					requestMethod = 'GET';

					const queryParameters = this.getNodeParameter('queryParameters', i) as IDataObject;

					for (const key of Object.keys(queryParameters)) {
						qs[key] = queryParameters[key];
					}

					endpoint = '/api/v1/belege/lieferscheine';
				}

			} else if (resource === 'gutschriften') {
				// ----------------------------------
				//         gutschriften
				// ----------------------------------

				if (operation === 'getById') {
					// ----------------------------------
					//         getByID
					// ----------------------------------
					requestMethod = 'GET';

					const id = this.getNodeParameter('id', i) as number;

					endpoint = `/api//v1/belege/gutschriften/${id}`;

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------
					requestMethod = 'GET';

					const queryParameters = this.getNodeParameter('queryParameters', i) as IDataObject;

					for (const key of Object.keys(queryParameters)) {
						qs[key] = queryParameters[key];
					}

					endpoint = '/api/v1/belege/gutschriften';
				}

			} else {
				throw new Error(`The resource '${resource}' is not known!`);
			}

			let responseData = null;
			if (usesOldApi) {
				responseData = await xentralRequestOldApi.call(
					this,
					requestMethod,
					endpoint,
					body
				);
			} else {
				responseData = await xentralRequest.call(
					this,
					requestMethod,
					endpoint,
					body,
					qs
				);
			}

			returnData.push(responseData as IDataObject);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
