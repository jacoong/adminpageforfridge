import { z } from "zod";

export const foodItemSchema = z.object({
  id: z.number(),
  master_name: z.string(),
  label: z.string().optional(),
  names: z.record(z.string()).optional(),
});

export type FoodItem = z.infer<typeof foodItemSchema>;

export const createFoodSchema = z.object({
  type: z.enum(["standard", "mystery", "cuisine"]),
  digitNumber: z.number().optional(),
  label: z.string().optional(),
  masterName: z.string().min(1, "Master name is required"),
  ko: z.string().optional(),
  en: z.string().optional(),
});

export type CreateFoodInput = z.infer<typeof createFoodSchema>;

export const patchFoodSchema = z.object({
  id: z.number({ required_error: "ID is required" }),
  master_name: z.string().optional(),
  label: z.string().optional(),
  names: z.record(z.string()).optional(),
});

export type PatchFoodInput = z.infer<typeof patchFoodSchema>;

export const deleteFoodSchema = z.object({
  id: z.number({ required_error: "ID is required" }),
});

export type DeleteFoodInput = z.infer<typeof deleteFoodSchema>;

export const migrationSchema = z.object({
  source_id: z.number({ required_error: "Source ID is required" }),
  ingredient_id: z.number({ required_error: "Target ID is required" }),
  lang_code: z.string().default("ko"),
  synonym: z.string().optional(),
});

export type MigrationInput = z.infer<typeof migrationSchema>;

export const nicknameSchema = z.object({
  ingredient_id: z.number({ required_error: "Ingredient ID is required" }),
  lang_code: z.string().default("ko"),
  synonym: z.string().min(1, "Synonym is required"),
});

export type NicknameInput = z.infer<typeof nicknameSchema>;

export const apiConfigSchema = z.object({
  baseUrl: z.string().min(1, "Base URL is required"),
});

export type ApiConfig = z.infer<typeof apiConfigSchema>;
