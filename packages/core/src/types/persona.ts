import { z } from 'zod';

export const PersonaIdentitySchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  emoji: z.string().optional(),
});

export const PersonaSoulSchema = z.object({
  coreTraits: z.array(z.string().min(1)).min(1),
  decisionFramework: z.string().min(1),
  priorities: z.array(z.string().min(1)).min(1),
  communicationStyle: z.string().optional(),
  guidelines: z.array(z.string()).optional(),
});

export const PersonaToolPreferencesSchema = z.object({
  preferred: z.array(z.string()).optional(),
  avoided: z.array(z.string()).optional(),
  usageHints: z.record(z.string()).optional(),
});

export const PersonaMemoryProtocolSchema = z.object({
  shouldRemember: z.array(z.string().min(1)).min(1),
  recallTriggers: z.array(z.string().min(1)).min(1),
  maxRecallEntries: z.number().int().positive().default(10),
});

export const PersonaAutonomySchema = z.object({
  canSelfAssign: z.boolean().default(false),
  maxGoalIterations: z.number().int().positive().default(5),
  reflectionEnabled: z.boolean().default(true),
  autoDecompose: z.boolean().default(true),
  confidenceThreshold: z.number().min(0).max(1).default(0.7),
});

export const PersonaSchema = z.object({
  identity: PersonaIdentitySchema,
  soul: PersonaSoulSchema,
  toolPreferences: PersonaToolPreferencesSchema.optional(),
  memoryProtocol: PersonaMemoryProtocolSchema.optional(),
  autonomy: PersonaAutonomySchema.optional(),
});

export type Persona = z.infer<typeof PersonaSchema>;
export type PersonaIdentity = z.infer<typeof PersonaIdentitySchema>;
export type PersonaSoul = z.infer<typeof PersonaSoulSchema>;
export type PersonaToolPreferences = z.infer<typeof PersonaToolPreferencesSchema>;
export type PersonaMemoryProtocol = z.infer<typeof PersonaMemoryProtocolSchema>;
export type PersonaAutonomy = z.infer<typeof PersonaAutonomySchema>;
