import { z } from 'zod';

export const BudgetPeriodSchema = z.enum(['daily', 'monthly', 'total']);
export type BudgetPeriod = z.infer<typeof BudgetPeriodSchema>;

export const BudgetUnitSchema = z.enum(['cost', 'premium_requests']);
export type BudgetUnit = z.infer<typeof BudgetUnitSchema>;

export const BudgetLimitSchema = z.object({
  maxCost: z.number().positive(),
  period: BudgetPeriodSchema,
  unit: BudgetUnitSchema.default('cost'),
  warningThresholds: z.array(z.number().min(0).max(1)).default([0.8, 0.9]),
});

export type BudgetLimit = z.infer<typeof BudgetLimitSchema>;

export const BudgetConfigSchema = z.object({
  global: BudgetLimitSchema.optional(),
  perAgent: z.record(BudgetLimitSchema).default({}),
}).default({});

export type BudgetConfig = z.infer<typeof BudgetConfigSchema>;

export interface BudgetStatus {
  id: string; // 'global' or agentId
  period: BudgetPeriod;
  unit: BudgetUnit;
  maxCost: number;
  currentCost: number;
  percentage: number;
  exceeded: boolean;
  warningThresholds: number[];
  triggeredThresholds: number[];
}

export interface BudgetAlert {
  id: string;
  budgetId: string; // 'global' or agentId
  type: 'warning' | 'exceeded';
  unit: BudgetUnit;
  threshold: number;
  currentCost: number;
  maxCost: number;
  timestamp: Date;
}
