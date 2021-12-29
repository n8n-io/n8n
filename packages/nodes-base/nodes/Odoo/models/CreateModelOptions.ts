import { IDataObject } from 'n8n-workflow';
import * as noteNote from './data/note.note.json';
import * as calendarEvent from './data/calendar.event.json';
import * as crmLead from './data/crm.lead.json';
import * as resPartner from './data/res.partner.json';
import * as stockPickingType from './data/stock.picking.type.json';

function createModelFieldsDescription(model: IDataObject) {
	const result = model.result || [];
	const options = Object.values(result).map((field) => {
		return {
			name: field.name,
			value: field.name,
			description: field.string,
		};
	});
	return options.sort((a, b) => a.name.localeCompare(b.name));
}

export const noteNoteFields = createModelFieldsDescription(noteNote);
export const calendarEventFields = createModelFieldsDescription(calendarEvent);
export const crmLeadFields = createModelFieldsDescription(crmLead);
export const resPartnerFields = createModelFieldsDescription(resPartner);
export const stockPickingFields = createModelFieldsDescription(stockPickingType);
