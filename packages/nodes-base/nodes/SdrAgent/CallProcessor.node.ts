import {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	INodeExecutionData,
	NodeConnectionType,
} from 'n8n-workflow';
import { getDbConnection } from '@utils/db';
import {
	createDynamicObject,
	adjustTimeByOffset,
	getWeekDayOfToday,
	checkTimeSlotDayWise,
	checkDynamicObject,
	agentVoiceProvider,
	NormalObjT,
} from './helper';
import Retell from 'retell-sdk';

export class CallProcessor implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Call Processor',
		name: 'callProcessor',
		group: ['transform'],
		version: 1,
		description:
			'Fetches SDR Agents, checks availability, fetches contacts, and processes calls using Retell API.',
		defaults: {
			name: 'Call Processor',
			color: '#28A745',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const [inputData] = this.getInputData();
		const { sdrAgentId, segmentId, maxAttempts, retryAfterDays } = inputData.json;

		if (!sdrAgentId || !segmentId) {
			throw new Error('SDR Agent ID and Segment ID are required.');
		}

		const connection = await getDbConnection();
		const sdrAgent = await fetchSDRAgent(connection, sdrAgentId);

		if (!sdrAgent) {
			console.log('No active SDR agent found.');
			return [[{ json: { message: 'No active SDR agent found.' } }]];
		}

		// Check if the SDR Agent is available
		const isAvailable = checkTimeSlotDayWise(
			sdrAgent.scheduling_hours,
			getWeekDayOfToday(sdrAgent.offset),
			sdrAgent.offset,
		);

		// if (!isAvailable) {
		// 	console.log('Agent not available in the current time slot.');
		// 	return [[{ json: { message: 'Agent unavailable at this time.' } }]];
		// }

		// Fetch eligible contacts
		const contacts = await fetchContacts(
			connection,
			segmentId,
			sdrAgent.offset,
			maxAttempts,
			retryAfterDays,
		);
		if (!contacts.length) {
			console.log('No eligible contacts found.');
			return [[{ json: { message: 'No eligible contacts found.' } }]];
		}

		// Process calls
		const callResults = await processCalls(contacts, sdrAgent);

		return [this.helpers.returnJsonArray(callResults)];
	}
}

// 🔹 Fetch SDR Agent details from DB
async function fetchSDRAgent(connection: any, sdrAgentId: any) {
	const [results] = await connection.execute(
		`SELECT sa.*, sa.id as agent_id, tz.*
         FROM sdr_agents AS sa
         JOIN s_a_scheduling_details AS sasd ON sa.id = sasd.sdr_agent_id
         JOIN timezones AS tz ON sasd.timezone = tz.id
         WHERE sa.id = ? AND sa.status = 'ACTIVE'`,
		[sdrAgentId],
	);
	return results.length ? results[0] : null;
}

// 🔹 Fetch eligible contacts from DB
async function fetchContacts(
	connection: any,
	segmentId: any,
	offset: string,
	maxAttempts: any,
	retryAfterDays: any,
) {
	const [contacts] = await connection.execute(
		`SELECT DISTINCT cal.*
         FROM customers_and_leads_segments AS cals
         JOIN customers_and_leads AS cal ON cals.customers_and_leads_id = cal.id
         LEFT JOIN sdr_agents_call_details AS sacd ON sacd.lead_id = cal.id
         WHERE cals.segment_id = ?
         AND cal.status NOT IN ('calling', 'non-responsive', 'do-not-call')
         AND (cal.status != 'call-back' 
              OR (CONVERT_TZ(NOW(), '+00:00', IFNULL(?, "+00:00")) >= 
                  CONVERT_TZ(cal.callback_timestamp, '+00:00', IFNULL(?, "+00:00"))))
         AND (
             (SELECT COUNT(*) FROM sdr_agents_call_details WHERE lead_id = cal.id) < ?
             AND COALESCE((SELECT MAX(created_at) FROM sdr_agents_call_details WHERE lead_id = cal.id), '1970-01-01') 
             <= DATE_SUB(NOW(), INTERVAL COALESCE(?, 0) DAY)
         )`,
		[segmentId, offset, offset, maxAttempts, retryAfterDays],
	);
	return contacts;
}

// 🔹 Process calls for each eligible contact
async function processCalls(contacts: any[], sdrAgent: any) {
	const callPromises = contacts.map(async (contact) => {
		try {
			console.log(`Calling ${contact.phone_number} from ${sdrAgent.agent_phone_number}...`);
			const dynamicVariables = (sdrAgent.dynamic_variables as string[]) || [];
			dynamicVariables.push('companyName');

			const dynamicVariableObj = createDynamicObject(contact?.custom_fields);
			dynamicVariableObj['leadName'] = contact.name.split(' ')[0];
			dynamicVariableObj['recipientName'] = contact.name.split(' ')[0];
			dynamicVariableObj['productName'] = contact.product_of_interest;
			dynamicVariableObj['currentTime'] = adjustTimeByOffset(new Date(), sdrAgent.offset);
			dynamicVariableObj['companyName'] = contact.company_name;
			const agentVoice = sdrAgent.agent_voice;
			const llmModel = sdrAgent.llm_model;

			if (checkDynamicObject(dynamicVariables, { ...dynamicVariableObj, ...contact })) {
				const callData = await createPhoneCall(
					sdrAgent.agent_phone_number,
					contact.phone_number,
					dynamicVariableObj,
					contact.company_id,
					{
						llm_model: llmModel,
						voice_provider: agentVoiceProvider(agentVoice),
					},
				);

				await storeCallDetails([
					sdrAgent.agent_id,
					callData.call_status,
					callData.call_id,
					contact.company_id,
					contact.id,
				]);
				await updateCallStatus(contact.id, 'calling');
				return { ...contact, ...callData };
			} else {
				console.log(`Skipping call for lead ${contact.id} (not eligible).`);
			}
		} catch (error) {
			console.error(`Error processing lead ${contact.id}:`, error);
			throw new Error(error);
		}
	});

	return Promise.all(callPromises);
}

// 🔹 Database Helper Functions
async function storeCallDetails(records: any[]) {
	const connection = await getDbConnection();
	await connection.execute(
		'INSERT INTO sdr_agents_call_details (sdr_agent_id, call_current_status, retell_call_id, company_id, lead_id) VALUES (?, ?, ?, ?, ?)',
		records,
	);
}

async function updateCallStatus(contactId: number, status: string) {
	const connection = await getDbConnection();
	await connection.execute(
		'UPDATE customers_and_leads SET status = ?, callback_timestamp = NULL WHERE id = ?',
		[status, contactId],
	);
}

// 🔹 Retell API Helper Functions
async function getRetellClient(companyId: number) {
	const connection = await getDbConnection();
	const [companies] = (await connection.execute(
		`SELECT retell_api_key FROM companies WHERE id = ?`,
		[companyId],
	)) as any[];
	if (!companies?.length) throw new Error('Retell API key not found.');
	return new Retell({ apiKey: companies[0]?.retell_api_key });
}

async function createPhoneCall(
	fromNumber: string,
	toNumber: string,
	dynamicVariables: NormalObjT,
	companyId: number,
	metadata?: NormalObjT,
) {
	const client = await getRetellClient(companyId);
	return client?.call?.createPhoneCall({
		from_number: fromNumber,
		to_number: toNumber,
		retell_llm_dynamic_variables: dynamicVariables,
		metadata,
	});
}
