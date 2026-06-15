import http from "node:http";
import { issueToken, verifyPassword, verifyToken } from "./auth.js";
import { findUserByEmail, ROLES } from "./users.js";
import { json, parseJsonBody } from "./http.js";
import {
  listClients,
  listClientsByOwner,
  getClientById,
  createClient,
  updateClient,
  deleteClient
} from "./clientStore.js";
import { validateClientInput, validateLoginInput } from "./validation.js";

function parseAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}

function authorize(req) {
  const auth = parseAuth(req);
  if (!auth) return null;
  return { userId: auth.sub, role: auth.role, email: auth.email };
}

function canManageClients(role) {
  return role === ROLES.admin || role === ROLES.agent;
}

function parseClientId(pathname) {
  const match = pathname.match(/^\/api\/clients\/([a-zA-Z0-9\-]+)$/);
  return match ? match[1] : null;
}

export function createAppServer() {
  return http.createServer(async (req, res) => {
    try {
      if (req.method === "OPTIONS") {
        return json(res, 204, {});
      }

      const url = new URL(req.url, "http://localhost");

      if (req.method === "GET" && url.pathname === "/api/health") {
        return json(res, 200, { status: "ok" });
      }

      if (req.method === "POST" && url.pathname === "/api/auth/login") {
        const body = await parseJsonBody(req);
        const loginError = validateLoginInput(body);
        if (loginError) return json(res, 400, { error: loginError });

        const user = findUserByEmail(body.email);
        if (!user || !verifyPassword(body.password, user.passwordHash)) {
          return json(res, 401, { error: "Identifiants invalides" });
        }

        const token = issueToken({ sub: user.id, role: user.role, email: user.email });
        return json(res, 200, {
          token,
          user: { id: user.id, email: user.email, role: user.role }
        });
      }

      if (url.pathname === "/api/clients/me" && req.method === "GET") {
        const actor = authorize(req);
        if (!actor) return json(res, 401, { error: "Non authentifié" });
        if (actor.role !== ROLES.client) return json(res, 403, { error: "Accès refusé" });
        return json(res, 200, { data: listClientsByOwner(actor.userId) });
      }

      if (url.pathname === "/api/clients" && req.method === "GET") {
        const actor = authorize(req);
        if (!actor) return json(res, 401, { error: "Non authentifié" });
        if (!canManageClients(actor.role)) return json(res, 403, { error: "Accès refusé" });
        return json(res, 200, { data: listClients() });
      }

      if (url.pathname === "/api/clients" && req.method === "POST") {
        const actor = authorize(req);
        if (!actor) return json(res, 401, { error: "Non authentifié" });
        if (!canManageClients(actor.role)) return json(res, 403, { error: "Accès refusé" });

        const body = await parseJsonBody(req);
        const validationError = validateClientInput(body);
        if (validationError) return json(res, 400, { error: validationError });

        const created = createClient({ ...body, ownerUserId: body.ownerUserId ?? null });
        return json(res, 201, { data: created });
      }

      const clientId = parseClientId(url.pathname);
      if (clientId && req.method === "GET") {
        const actor = authorize(req);
        if (!actor) return json(res, 401, { error: "Non authentifié" });
        const record = getClientById(clientId);
        if (!record) return json(res, 404, { error: "Client introuvable" });

        const isOwner = actor.role === ROLES.client && record.ownerUserId === actor.userId;
        if (!canManageClients(actor.role) && !isOwner) {
          return json(res, 403, { error: "Accès refusé" });
        }

        return json(res, 200, { data: record });
      }

      if (clientId && req.method === "PUT") {
        const actor = authorize(req);
        if (!actor) return json(res, 401, { error: "Non authentifié" });
        if (!canManageClients(actor.role)) return json(res, 403, { error: "Accès refusé" });

        const body = await parseJsonBody(req);
        const validationError = validateClientInput(body, true);
        if (validationError) return json(res, 400, { error: validationError });

        const updated = updateClient(clientId, body);
        if (!updated) return json(res, 404, { error: "Client introuvable" });
        return json(res, 200, { data: updated });
      }

      if (clientId && req.method === "DELETE") {
        const actor = authorize(req);
        if (!actor) return json(res, 401, { error: "Non authentifié" });
        if (!canManageClients(actor.role)) return json(res, 403, { error: "Accès refusé" });

        const removed = deleteClient(clientId);
        if (!removed) return json(res, 404, { error: "Client introuvable" });
        return json(res, 204, {});
      }

      return json(res, 404, { error: "Route introuvable" });
    } catch (error) {
      if (error instanceof SyntaxError) {
        return json(res, 400, { error: "JSON invalide" });
      }
      return json(res, 500, { error: "Erreur interne" });
    }
  });
}
