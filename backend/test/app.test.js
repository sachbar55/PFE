import test from "node:test";
import assert from "node:assert/strict";
import { createAppServer } from "../src/server.js";
import { resetClientsForTest } from "../src/clientStore.js";

async function startServer() {
  const server = createAppServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(resolve))
  };
}

async function login(baseUrl, email, password) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  return response;
}

test("health endpoint responds", async () => {
  resetClientsForTest();
  const app = await startServer();

  const response = await fetch(`${app.baseUrl}/api/health`);
  assert.equal(response.status, 200);

  await app.close();
});

test("admin can create and list clients", async () => {
  resetClientsForTest();
  const app = await startServer();

  const authResponse = await login(app.baseUrl, "admin@atlanta.local", "Admin123!");
  const authData = await authResponse.json();

  const createResponse = await fetch(`${app.baseUrl}/api/clients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + authData.token
    },
    body: JSON.stringify({
      firstName: "Amina",
      lastName: "El Idrissi",
      email: "amina@example.com",
      phone: "+212600000000",
      policyNumber: "POL-100",
      ownerUserId: "u-client"
    })
  });

  assert.equal(createResponse.status, 201);

  const listResponse = await fetch(`${app.baseUrl}/api/clients`, {
    headers: { Authorization: "Bearer " + authData.token }
  });
  const listData = await listResponse.json();

  assert.equal(listResponse.status, 200);
  assert.equal(listData.data.length, 1);

  await app.close();
});

test("client role cannot create clients but can read own records", async () => {
  resetClientsForTest();
  const app = await startServer();

  const adminAuth = await login(app.baseUrl, "admin@atlanta.local", "Admin123!");
  const adminData = await adminAuth.json();
  await fetch(`${app.baseUrl}/api/clients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + adminData.token
    },
    body: JSON.stringify({
      firstName: "Client",
      lastName: "Demo",
      email: "client.demo@example.com",
      phone: "+212611111111",
      policyNumber: "POL-200",
      ownerUserId: "u-client"
    })
  });

  const clientAuth = await login(app.baseUrl, "client@atlanta.local", "Client123!");
  const clientData = await clientAuth.json();

  const createResponse = await fetch(`${app.baseUrl}/api/clients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + clientData.token
    },
    body: JSON.stringify({
      firstName: "X",
      lastName: "Y",
      email: "x@y.com",
      phone: "0",
      policyNumber: "POL-300"
    })
  });

  assert.equal(createResponse.status, 403);

  const ownResponse = await fetch(`${app.baseUrl}/api/clients/me`, {
    headers: { Authorization: "Bearer " + clientData.token }
  });
  const ownData = await ownResponse.json();

  assert.equal(ownResponse.status, 200);
  assert.equal(ownData.data.length, 1);

  await app.close();
});
