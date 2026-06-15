const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

export function validateLoginInput(body) {
  if (!body || typeof body !== "object") return "Body JSON invalide";
  if (!body.email || !emailRegex.test(String(body.email))) return "Email invalide";
  if (!body.password || !passwordRegex.test(String(body.password))) {
    return "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial";
  }
  return null;
}

export function validateClientInput(body, partial = false) {
  if (!body || typeof body !== "object") return "Body JSON invalide";

  const requiredFields = ["firstName", "lastName", "email", "phone", "policyNumber"];
  if (!partial) {
    for (const field of requiredFields) {
      if (!body[field] || String(body[field]).trim().length === 0) {
        return `Champ obligatoire manquant: ${field}`;
      }
    }
  }

  if (body.email && !emailRegex.test(String(body.email))) return "Email client invalide";
  return null;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateFraudInput(body) {
  if (!body || typeof body !== "object") return "Body JSON invalide";

  const categoricalFields = ["marque", "marque2", "ville", "compagnie", "garantie", "responsabilite"];
  for (const field of categoricalFields) {
    if (!isNonEmptyString(body[field])) return `Champ obligatoire manquant: ${field}`;
  }

  if (!Number.isFinite(Number(body.montant_dommage)) || Number(body.montant_dommage) < 0) {
    return "montant_dommage doit être un nombre positif ou nul";
  }

  if (!Number.isInteger(Number(body.periode)) || Number(body.periode) < 0) {
    return "periode doit être un entier positif ou nul";
  }

  const date = new Date(body.date_sinistre);
  if (!isNonEmptyString(body.date_sinistre) || Number.isNaN(date.getTime())) {
    return "date_sinistre doit être une date valide (YYYY-MM-DD)";
  }

  return null;
}
