import Dexie, { type Table } from 'dexie';

export interface WorkflowDB {
  id: string;
  name: string;
  nodesJSON: string;
  connectionsJSON: string;
  settingsJSON: string;
  createdAt: number;
  updatedAt: number;
}

export interface TaxReturnDB {
  id: string;
  workflowId: string;
  taxYear: number;
  dataJSON: string;
  createdAt: number;
}

export class TaxFlowDatabase extends Dexie {
  workflows!: Table<WorkflowDB>;
  taxReturns!: Table<TaxReturnDB>;

  constructor() {
    super('TaxFlowDB');

    this.version(1).stores({
      workflows: 'id, name, updatedAt',
      taxReturns: 'id, workflowId, taxYear, createdAt',
    });
  }
}

export const db = new TaxFlowDatabase();
