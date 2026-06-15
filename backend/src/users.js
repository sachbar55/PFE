import { hashPassword } from "./auth.js";

export const ROLES = {
  admin: "admin",
  agent: "agent",
  client: "client"
};

const seedUsers = [
  { id: "u-admin", email: "admin@atlanta.local", password: "Admin123!", role: ROLES.admin },
  { id: "u-agent", email: "agent@atlanta.local", password: "Agent123!", role: ROLES.agent },
  { id: "u-client", email: "client@atlanta.local", password: "Client123!", role: ROLES.client }
];

export const users = seedUsers.map((user) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  passwordHash: hashPassword(user.password)
}));

export function findUserByEmail(email) {
  return users.find((user) => user.email.toLowerCase() === String(email).toLowerCase()) ?? null;
}
