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
const fraudForm = document.querySelector("#fraud-form");
const fraudResult = document.querySelector("#fraud-result");

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

async function scoreFraud(event) {
  event.preventDefault();

  const body = {
    marque: document.querySelector("#fraud-marque").value,
    marque2: document.querySelector("#fraud-marque2").value,
    ville: document.querySelector("#fraud-ville").value,
    compagnie: document.querySelector("#fraud-compagnie").value,
    garantie: document.querySelector("#fraud-garantie").value,
    responsabilite: document.querySelector("#fraud-responsabilite").value,
    montant_dommage: Number(document.querySelector("#fraud-montant").value),
    periode: Number(document.querySelector("#fraud-periode").value),
    date_sinistre: document.querySelector("#fraud-date").value
  };

  const response = await fetch(`${apiBaseUrl}/api/fraude/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();

  if (!response.ok) {
    fraudResult.textContent = `Erreur scoring: ${payload.error ?? "inconnue"}`;
    return;
  }

  fraudResult.textContent = `Score: ${payload.score_fraude} | Risque: ${payload.niveau_risque} | Seuil: ${payload.seuil}`;
}

loginForm.addEventListener("submit", login);
clientForm.addEventListener("submit", createClient);
refreshButton.addEventListener("click", loadClients);
fraudForm.addEventListener("submit", scoreFraud);
