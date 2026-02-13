import { z } from "zod";

export const FOOD_LABELS = [
  "egg",
  "fish",
  "seafood",
  "meat",
  "poultry",
  "processed_meat",
  "dairy",
  "cheese",
  "yogurt",
  "vegetable",
  "fruit",
  "legume",
  "nut",
  "seed",
  "grain",
  "rice",
  "noodle",
  "bread",
  "oil",
  "sauce",
  "spice",
  "raw",
  "cooked",
  "fermented",
  "snack",
  "dessert",
  "beverage",
  "leftover",
  "other",
] as const;

export const SUPPORTED_LANGUAGE_CODES = [
  "ko",
  "en",
  "ja",
  "zh",
  "fr",
  "es",
  "it",
  "de",
  "vi",
  "th",
] as const;

export const foodItemSchema = z.object({
  id: z.number(),
  master_name: z.string(),
  label: z.string().optional(),
  names: z.record(z.string()).optional(),
});

export type FoodItem = z.infer<typeof foodItemSchema>;

const localizedNamesSchema = z.record(z.string().min(1, "Name value is required")).optional();

export const createFoodSchema = z
  .object({
    type: z.enum(["standard", "mystery", "cuisine"]),
    digitNumber: z.number().optional(),
    label: z.enum(FOOD_LABELS).optional(),
    masterName: z.string().min(1, "Master name is required"),
    names: localizedNamesSchema,
  })
  .superRefine((value, ctx) => {
    if (value.names) {
      for (const [lang, name] of Object.entries(value.names)) {
        if (name.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["names", lang],
            message: "Name value is required",
          });
        }
      }
    }

    if (value.type === "standard") {
      if (typeof value.digitNumber !== "number" || Number.isNaN(value.digitNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["digitNumber"],
          message: "Digit range is required for standard food",
        });
      }

      if (!value.label) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["label"],
          message: "Label is required for standard food",
        });
      }

      if (!value.names || Object.keys(value.names).length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["names"],
          message: "Localized names are required for standard food",
        });
      }
    }
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
