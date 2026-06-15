import crypto from "node:crypto";

const clients = new Map();

function nowIso() {
  return new Date().toISOString();
}

function buildClient(input) {
  return {
    id: crypto.randomUUID(),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    policyNumber: input.policyNumber.trim(),
    ownerUserId: input.ownerUserId ?? null,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

export function listClients() {
  return [...clients.values()];
}

export function listClientsByOwner(ownerUserId) {
  return [...clients.values()].filter((client) => client.ownerUserId === ownerUserId);
}

export function getClientById(id) {
  return clients.get(id) ?? null;
}

export function createClient(input) {
  const client = buildClient(input);
  clients.set(client.id, client);
  return client;
}

export function updateClient(id, input) {
  const existing = clients.get(id);
  if (!existing) return null;

  const updated = {
    ...existing,
    firstName: input.firstName ? input.firstName.trim() : existing.firstName,
    lastName: input.lastName ? input.lastName.trim() : existing.lastName,
    email: input.email ? input.email.trim().toLowerCase() : existing.email,
    phone: input.phone ? input.phone.trim() : existing.phone,
    policyNumber: input.policyNumber ? input.policyNumber.trim() : existing.policyNumber,
    ownerUserId: Object.hasOwn(input, "ownerUserId") ? input.ownerUserId : existing.ownerUserId,
    updatedAt: nowIso()
  };

  clients.set(id, updated);
  return updated;
}

export function deleteClient(id) {
  return clients.delete(id);
}

export function resetClientsForTest() {
  clients.clear();
}
