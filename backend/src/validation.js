const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLoginInput(body) {
  if (!body || typeof body !== "object") return "Body JSON invalide";
  if (!body.email || !emailRegex.test(String(body.email))) return "Email invalide";
  if (!body.password || String(body.password).length < 8) return "Le mot de passe doit contenir au moins 8 caractères";
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
