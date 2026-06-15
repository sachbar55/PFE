import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_FEATURE_ORDER = [
  "marque",
  "marque2",
  "ville",
  "compagnie",
  "garantie",
  "responsabilite",
  "type_ville",
  "type_montant",
  "type_marque",
  "type_marque2",
  "montant_dommage",
  "periode",
  "timestamp"
];

const DEFAULT_RISK_THRESHOLD = 0.5;

class FraudScoringError extends Error {
  constructor(message, code = "SCORING_FAILED") {
    super(message);
    this.name = "FraudScoringError";
    this.code = code;
  }
}

function resolveDefaultPath(...segments) {
  return path.resolve(process.cwd(), ...segments);
}

function normalizeEncoderConfig(raw) {
  const encoders = raw.encoders ?? raw;
  const fallbackValue = Number.isInteger(raw.fallbackValue) ? raw.fallbackValue : 0;
  const featureOrder = Array.isArray(raw.featureOrder) ? raw.featureOrder : DEFAULT_FEATURE_ORDER;
  return { encoders, fallbackValue, featureOrder };
}

function findFallbackValue(mapping, globalFallback) {
  const localFallbackKeys = ["Autre", "AUTRE", "__unknown__", "__UNKNOWN__", "UNKNOWN"];
  for (const key of localFallbackKeys) {
    if (Object.prototype.hasOwnProperty.call(mapping, key)) {
      return Number(mapping[key]);
    }
  }
  return globalFallback;
}

function encodeCategoricalValue(field, rawValue, encoders, globalFallback) {
  const mapping = encoders[field];
  if (!mapping || typeof mapping !== "object") {
    throw new FraudScoringError(`Mapping manquant pour ${field}`, "ENCODER_MISSING");
  }

  if (Object.prototype.hasOwnProperty.call(mapping, rawValue)) {
    return Number(mapping[rawValue]);
  }

  const fallback = findFallbackValue(mapping, globalFallback);
  if (Number.isFinite(fallback)) return fallback;
  throw new FraudScoringError(`Valeur inconnue pour ${field}: ${rawValue}`, "UNKNOWN_CATEGORY");
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function deriveTypeVille(ville) {
  const grandesVilles = new Set(["CASABLANCA", "RABAT", "MARRAKECH", "TANGER", "FES"]);
  return grandesVilles.has(normalizeText(ville)) ? "URBAINE" : "AUTRE";
}

function deriveTypeMontant(montant) {
  const value = Number(montant);
  if (value >= 50000) return "TRES_ELEVE";
  if (value >= 20000) return "ELEVE";
  if (value >= 5000) return "MOYEN";
  return "FAIBLE";
}

function deriveTypeMarque(marque) {
  const premium = new Set(["BMW", "MERCEDES-BENZ", "AUDI", "LEXUS", "PORSCHE", "LAND ROVER"]);
  const economical = new Set(["DACIA", "RENAULT", "FIAT", "HYUNDAI", "KIA", "SKODA"]);
  const normalized = normalizeText(marque);
  if (premium.has(normalized)) return "PREMIUM";
  if (economical.has(normalized)) return "ECONOMIQUE";
  return "STANDARD";
}

function buildFeatureMap(input) {
  const accidentDate = new Date(input.date_sinistre);
  return {
    marque: String(input.marque).trim(),
    marque2: String(input.marque2).trim(),
    ville: String(input.ville).trim(),
    compagnie: String(input.compagnie).trim(),
    garantie: String(input.garantie).trim(),
    responsabilite: String(input.responsabilite).trim(),
    type_ville: deriveTypeVille(input.ville),
    type_montant: deriveTypeMontant(input.montant_dommage),
    type_marque: deriveTypeMarque(input.marque),
    type_marque2: deriveTypeMarque(input.marque2),
    montant_dommage: Number(input.montant_dommage),
    periode: Number(input.periode),
    timestamp: Math.floor(accidentDate.getTime() / 1000)
  };
}

function scoreWithPythonRunner(featureVector, options) {
  const runnerOutput = spawnSync(
    options.pythonCommand,
    [options.runnerPath],
    {
      encoding: "utf8",
      input: JSON.stringify({
        modelPath: options.modelPath,
        features: featureVector
      }),
      timeout: 5000
    }
  );

  if (runnerOutput.error) {
    throw new FraudScoringError("Impossible d'exécuter le moteur ML", "RUNTIME_ERROR");
  }

  if (runnerOutput.status !== 0) {
    const message = runnerOutput.stderr?.trim() || "Erreur inconnue du moteur ML";
    if (message.includes("MODEL_NOT_FOUND")) {
      throw new FraudScoringError("Modèle IA introuvable", "MODEL_NOT_READY");
    }
    throw new FraudScoringError(message, "MODEL_EXECUTION_FAILED");
  }

  let result;
  try {
    result = JSON.parse(runnerOutput.stdout);
  } catch {
    throw new FraudScoringError("Réponse invalide du moteur ML", "MODEL_RESPONSE_INVALID");
  }

  const score = Number(result.score_fraude);
  if (!Number.isFinite(score)) {
    throw new FraudScoringError("Score IA invalide", "MODEL_RESPONSE_INVALID");
  }
  return score;
}

export function createFraudScorer(options = {}) {
  const modelPath = options.modelPath ?? process.env.FRAUD_MODEL_PATH ?? resolveDefaultPath("backend", "models", "model_rf_fraud.pkl");
  const encodersPath = options.encodersPath ?? process.env.FRAUD_ENCODERS_PATH ?? resolveDefaultPath("backend", "models", "encoders.json");
  const pythonCommand = options.pythonCommand ?? process.env.FRAUD_PYTHON_CMD ?? "python3";
  const runnerPath = options.runnerPath ?? resolveDefaultPath("backend", "src", "fraudModelRunner.py");
  const scoringEngine = options.scoringEngine ?? scoreWithPythonRunner;

  let cachedConfigPromise = null;
  async function loadEncoderConfig() {
    if (!cachedConfigPromise) {
      cachedConfigPromise = fs.readFile(encodersPath, "utf8").then((content) => normalizeEncoderConfig(JSON.parse(content)));
    }
    return cachedConfigPromise;
  }

  return {
    async score(payload) {
      const encoderConfig = await loadEncoderConfig().catch(() => {
        throw new FraudScoringError("Encoders introuvables ou invalides", "ENCODER_NOT_READY");
      });

      const features = buildFeatureMap(payload);
      const preparedFeatures = {};

      for (const [field, value] of Object.entries(features)) {
        if (typeof value === "string") {
          preparedFeatures[field] = encodeCategoricalValue(field, value, encoderConfig.encoders, encoderConfig.fallbackValue);
        } else {
          preparedFeatures[field] = value;
        }
      }

      const vector = encoderConfig.featureOrder.map((field) => {
        if (!Object.prototype.hasOwnProperty.call(preparedFeatures, field)) {
          throw new FraudScoringError(`Feature manquante: ${field}`, "FEATURE_MISSING");
        }
        return preparedFeatures[field];
      });

      const score = scoringEngine(vector, { modelPath, pythonCommand, runnerPath });
      const threshold = Number.isFinite(Number(payload.seuil)) ? Number(payload.seuil) : DEFAULT_RISK_THRESHOLD;
      const niveauRisque = score >= threshold ? "élevé" : score >= 0.3 ? "moyen" : "faible";

      return {
        score_fraude: Number(score.toFixed(4)),
        niveau_risque: niveauRisque,
        seuil: threshold
      };
    }
  };
}

export { FraudScoringError };
