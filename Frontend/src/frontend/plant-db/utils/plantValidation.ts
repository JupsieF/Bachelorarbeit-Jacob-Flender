import { z } from "zod";

// Enum für die Größe und Methode
const sizeEnum = z.enum(["small", "medium", "large"]);
const methodEnum = z.enum(["nur die Erde gießen", "über die Blätter gießen"]);

// CREATE von bereits vorhandenen Plants
export const plantInsertSchema = z.object({
  name: z.string().min(1),
  location_id: z.number(),
  care_id: z.number(),
  size: sizeEnum,
  image_url: z.string().url().nullable().optional(),
});

// CREATE von neuen Plants
export const plantInstanceInsertSchema = z.object({
  name: z.string().min(1),
  location_id: z.number(),
  volume: z.number().min(0),
  method: methodEnum,
  interval: z.number().min(1),
  size: sizeEnum,
  image_url: z.string().url().nullable().optional(),
});

// UPDATE
export const plantUpdateSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  location_id: z.number().optional(),
  care_id: z.number().optional(),
  size: sizeEnum.optional(),
  image_url: z.string().url().nullable().optional(),
});

// DELETE
export const plantDeleteSchema = z.object({
  id: z.number(),
});

// READ
export const plantReadSchema = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
  location_id: z.number().optional(),
  care_id: z.number().optional(),
  size: sizeEnum.optional(),
});

// UPDATE für Plant_Care
export const plantCareUpdateSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  interval: z.number().min(1).optional(),
  method: methodEnum.optional(),
  volume: z.number().min(0).optional(),
});

// Hinzufügen von Bildern
export const plantImageSchema = z.object({
  plantId: z.number().int().positive(),
});