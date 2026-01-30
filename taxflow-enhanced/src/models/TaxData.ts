import { z } from 'zod';

export const TaxDataSchema = z.object({
  json: z.record(z.string(), z.any()),
  metadata: z.object({
    nodeType: z.string(),
    nodeVersion: z.number().default(1),
    timestamp: z.number(),
    itemIndex: z.number().optional(),
  }).optional(),
});

export type TaxData = z.infer<typeof TaxDataSchema>;

export interface TaxDataItem {
  json: Record<string, any>;
  metadata?: {
    nodeType?: string;
    nodeVersion?: number;
    timestamp?: number;
    itemIndex?: number;
  };
}
