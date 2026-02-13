import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import {
  apiConfigSchema,
  createFoodSchema,
  patchFoodSchema,
  deleteFoodSchema,
  nicknameSchema,
  migrationSchema,
  SUPPORTED_LANGUAGE_CODES,
} from "@shared/schema";
import { ZodError } from "zod";

const DEFAULT_BASE_URL = (process.env.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");

function getBaseUrl(req: any): string {
  return req.app.locals.apiBaseUrl || DEFAULT_BASE_URL;
}

function handleZodError(res: any, err: ZodError) {
  const messages = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
  return res.status(400).json({ error: "Validation failed", details: messages });
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  return res.status(401).json({ error: "Not authenticated" });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.locals.apiBaseUrl = DEFAULT_BASE_URL;

  app.post("/api/admin", async (req, res) => {
    const { username, password } = req.body;
    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const baseUrl = getBaseUrl(req);
    try {
      const awsRes = await fetch(`${baseUrl}/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (awsRes.ok) {
        req.session.authenticated = true;
        return req.session.save((err) => {
          if (err) {
            return res.status(500).json({ error: "Session error" });
          }
          res.json({ ok: true });
        });
      }

      return res.status(401).json({ error: "Invalid password" });
    } catch (err: any) {
      return res.status(502).json({ error: `Unable to verify credentials: ${err.message}` });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.session && req.session.authenticated) {
      return res.json({ authenticated: true });
    }
    return res.json({ authenticated: false });
  });

  app.use("/api/config", requireAuth);
  app.use("/api/search", requireAuth);
  app.use("/api/range", requireAuth);
  app.use("/api/food", requireAuth);
  app.use("/api/fooditem", requireAuth);
  app.use("/api/ingredient", requireAuth);
  app.use("/api/nickname", requireAuth);
  app.use("/api/migration", requireAuth);

  app.post("/api/config", (req, res) => {
    const result = apiConfigSchema.safeParse(req.body);
    if (!result.success) return handleZodError(res, result.error);
    req.app.locals.apiBaseUrl = result.data.baseUrl.replace(/\/$/, "");
    res.json({ ok: true });
  });

  app.get("/api/config", (req, res) => {
    res.json({ baseUrl: req.app.locals.apiBaseUrl || "" });
  });

  app.get("/api/search/:query", async (req, res) => {
    const baseUrl = getBaseUrl(req);
    if (!baseUrl) return res.status(400).json({ error: "API not configured. Set your AWS Gateway URL in settings." });
    try {
      const response = await fetch(`${baseUrl}/search?q=${encodeURIComponent(req.params.query)}`);
      const data = await response.json();
      res.json(data.data || []);
    } catch (err: any) {
      res.status(502).json({ error: `Failed to reach API: ${err.message}` });
    }
  });

  app.get("/api/range/:digit", async (req, res) => {
    const baseUrl = getBaseUrl(req);
    if (!baseUrl) return res.status(400).json({ error: "API not configured. Set your AWS Gateway URL in settings." });
    const digit = parseInt(req.params.digit);
    if (isNaN(digit)) return res.status(400).json({ error: "Invalid digit number" });
    try {
      const response = await fetch(`${baseUrl}/getxdigititems?digitNumber=${digit}`);
      const data = await response.json();
      res.json(data.data || []);
    } catch (err: any) {
      res.status(502).json({ error: `Failed to reach API: ${err.message}` });
    }
  });

  app.post("/api/food", async (req, res) => {
    const baseUrl = getBaseUrl(req);
    if (!baseUrl) return res.status(400).json({ error: "API not configured. Set your AWS Gateway URL in settings." });

    const result = createFoodSchema.safeParse(req.body);
    if (!result.success) return handleZodError(res, result.error);

    const { type, digitNumber, label, masterName, names } = result.data;

    try {
      let endpoint = "/createNewFood";
      if (type === "mystery") endpoint = "/createMisteryFood";
      if (type === "cuisine") endpoint = "/createCuisineFood";

      const normalizedMasterName = masterName.trim();
      const normalizedNames: Record<string, string> = {};
      for (const [lang, value] of Object.entries(names || {})) {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          normalizedNames[lang] = trimmed;
        }
      }

      if (type !== "standard" && Object.keys(normalizedNames).length === 0) {
        for (const langCode of SUPPORTED_LANGUAGE_CODES) {
          normalizedNames[langCode] = normalizedMasterName;
        }
      }

      let payload: any;
      if (type === "standard") {
        if (!label) {
          return res.status(400).json({ error: "Label is required for standard food" });
        }
        if (typeof digitNumber !== "number" || Number.isNaN(digitNumber)) {
          return res.status(400).json({ error: "Digit range is required for standard food" });
        }
        if (Object.keys(normalizedNames).length === 0) {
          return res.status(400).json({ error: "Localized names are required for standard food" });
        }

        payload = {
          digitNumber: Number(digitNumber),
          food: { masterName: normalizedMasterName, label, names: normalizedNames },
        };
      } else {
        payload = { masterName: normalizedMasterName, names: normalizedNames };
      }

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([payload]),
      });
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(502).json({ error: `Failed to reach API: ${err.message}` });
    }
  });

  app.patch("/api/fooditem", async (req, res) => {
    const baseUrl = getBaseUrl(req);
    if (!baseUrl) return res.status(400).json({ error: "API not configured. Set your AWS Gateway URL in settings." });

    const result = patchFoodSchema.safeParse(req.body);
    if (!result.success) return handleZodError(res, result.error);

    try {
      const response = await fetch(`${baseUrl}/patch/fooditem`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([result.data]),
      });
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(502).json({ error: `Failed to reach API: ${err.message}` });
    }
  });

  app.delete("/api/ingredient", async (req, res) => {
    const baseUrl = getBaseUrl(req);
    if (!baseUrl) return res.status(400).json({ error: "API not configured. Set your AWS Gateway URL in settings." });

    const result = deleteFoodSchema.safeParse(req.body);
    if (!result.success) return handleZodError(res, result.error);

    try {
      const response = await fetch(`${baseUrl}/delete/ingredient`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ id: result.data.id }]),
      });
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(502).json({ error: `Failed to reach API: ${err.message}` });
    }
  });

  app.post("/api/nickname", async (req, res) => {
    const baseUrl = getBaseUrl(req);
    if (!baseUrl) return res.status(400).json({ error: "API not configured. Set your AWS Gateway URL in settings." });

    const result = nicknameSchema.safeParse(req.body);
    if (!result.success) return handleZodError(res, result.error);

    try {
      const response = await fetch(`${baseUrl}/addNickname`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([result.data]),
      });
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(502).json({ error: `Failed to reach API: ${err.message}` });
    }
  });

  app.post("/api/migration", async (req, res) => {
    const baseUrl = getBaseUrl(req);
    if (!baseUrl) return res.status(400).json({ error: "API not configured. Set your AWS Gateway URL in settings." });

    const result = migrationSchema.safeParse(req.body);
    if (!result.success) return handleZodError(res, result.error);

    try {
      const response = await fetch(`${baseUrl}/migrationIngredientToNickname`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([result.data]),
      });
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(502).json({ error: `Failed to reach API: ${err.message}` });
    }
  });

  return httpServer;
}
