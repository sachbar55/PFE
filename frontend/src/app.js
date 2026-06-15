const apiBaseUrl = window.API_BASE_URL ?? "http://localhost:3000";

const state = {
  token: null,
  user: null
};

const loginForm = document.querySelector("#login-form");
const clientForm = document.querySelector("#client-form");
const clientsList = document.querySelector("#clients-list");
const authStatus = document.querySelector("#auth-status");
const refreshButton = document.querySelector("#refresh-clients");

function setAuthStatus(text) {
  authStatus.textContent = text;
}

async function login(event) {
  event.preventDefault();
  const email = document.querySelector("#email").value;
  const password = document.querySelector("#password").value;

  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const payload = await response.json();
  if (!response.ok) {
    setAuthStatus(`Erreur: ${payload.error}`);
    return;
  }

  state.token = payload.token;
  state.user = payload.user;
  setAuthStatus(`Connecté en tant que ${payload.user.email} (${payload.user.role})`);
  await loadClients();
}

async function loadClients() {
  if (!state.token) {
    setAuthStatus("Veuillez vous connecter");
    return;
  }

  const endpoint = state.user.role === "client" ? "/api/clients/me" : "/api/clients";

  const response = await fetch(`${apiBaseUrl}${endpoint}`, {
    headers: { Authorization: "Bearer " + state.token }
  });

  const payload = await response.json();
  if (!response.ok) {
    setAuthStatus(`Erreur clients: ${payload.error}`);
    return;
  }

  clientsList.innerHTML = "";
  payload.data.forEach((client) => {
    const item = document.createElement("li");
    item.textContent = `${client.firstName} ${client.lastName} - ${client.email} - ${client.policyNumber}`;
    clientsList.appendChild(item);
  });
}

async function createClient(event) {
  event.preventDefault();
  if (!state.token) {
    setAuthStatus("Veuillez vous connecter avant d'ajouter un client.");
    return;
  }

  const body = {
    firstName: document.querySelector("#firstName").value,
    lastName: document.querySelector("#lastName").value,
    email: document.querySelector("#clientEmail").value,
    phone: document.querySelector("#phone").value,
    policyNumber: document.querySelector("#policyNumber").value
  };

  const response = await fetch(`${apiBaseUrl}/api/clients`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + state.token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  let responsePayload = {};
  try {
    responsePayload = await response.json();
  } catch (error) {
    console.error("Réponse JSON invalide lors de la création client", error);
  }
  if (!response.ok) {
    setAuthStatus(`Erreur création client: ${responsePayload.error ?? "inconnue"}`);
    return;
  }

  clientForm.reset();
  await loadClients();
}

loginForm.addEventListener("submit", login);
clientForm.addEventListener("submit", createClient);
refreshButton.addEventListener("click", loadClients);
