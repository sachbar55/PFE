# Plateforme de Gestion d'Assurance Automobile - PFE

Plateforme digitale intégrée pour AtlantaSanad Assurance couvrant le cycle complet de l'assurance automobile avec un module de détection de fraude basé sur le ML.

## Périmètre MVP v1 (implémenté)

### Inclus dans cette version
- Authentification (login) avec rôles `admin`, `agent`, `client`
- Module vertical **Gestion Clients** bout en bout
  - API HTTP
  - Modèle de données client
  - Validations métier de base
  - Tests automatiques backend
- Portail Web minimal pour:
  - se connecter
  - afficher les clients
  - créer un client (admin/agent)
  - afficher ses données (client)
- Infrastructure locale prête pour la suite:
  - PostgreSQL (Docker)
  - Redis (Docker)
- Qualité projet:
  - scripts lint/test/build
  - pipeline CI GitHub Actions

### Hors périmètre v1 (phase suivante)
- Module Contrats complet
- Module Sinistres complet
- Détection de fraude IA avancée (pipeline MLOps complet)
- Reporting avancé

Ces modules sont planifiés pour les prochaines itérations avec intégration continue.

## Structure du projet

- `/backend` : API Node.js (HTTP natif), auth + module clients
- `/frontend` : portail web minimal (HTML/CSS/JS)
- `docker-compose.yml` : stack locale (PostgreSQL, Redis, backend, frontend)
- `.github/workflows/ci.yml` : pipeline qualité

## Prérequis

- Node.js 18+
- Docker & Docker Compose

## Installation

```bash
npm install
```

## Variables d'environnement

Copier `.env.example` vers `.env` puis adapter si nécessaire.

Variables principales:
- `BACKEND_PORT` (défaut `3000`)
- `FRONTEND_PORT` (défaut `5173`)
- `AUTH_TOKEN_SECRET`
- `FRAUD_MODEL_PATH` (défaut `backend/models/model_rf_fraud.pkl`)
- `FRAUD_ENCODERS_PATH` (défaut `backend/models/encoders.json`)
- `FRAUD_PYTHON_CMD` (défaut `python3`)
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`
- `REDIS_PORT`

## Lancement local

### Option 1: Node local
```bash
npm run start --workspace backend
npm run start --workspace frontend
```

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5173`

### Option 2: Docker Compose
```bash
docker compose up --build
```

## Comptes de démonstration

- `admin@atlanta.local / Admin123!`
- `agent@atlanta.local / Agent123!`
- `client@atlanta.local / Client123!`

## Scripts qualité

```bash
npm run lint
npm run test
npm run build
```

## Endpoints principaux

- `POST /api/auth/login`
- `GET /api/health`
- `POST /api/fraude/score`
- `GET /api/clients` (admin/agent)
- `POST /api/clients` (admin/agent)
- `GET /api/clients/:id` (admin/agent/owner)
- `PUT /api/clients/:id` (admin/agent)
- `DELETE /api/clients/:id` (admin/agent)
- `GET /api/clients/me` (client)

## Scoring fraude IA

Endpoint:

```json
POST /api/fraude/score
{
  "marque": "BMW",
  "marque2": "DACIA",
  "ville": "CASABLANCA",
  "compagnie": "AXA MAROC",
  "garantie": "RC",
  "responsabilite": "100%",
  "montant_dommage": 45230.50,
  "periode": 6,
  "date_sinistre": "2026-06-10"
}
```

Réponse:

```json
{
  "score_fraude": 0.78,
  "niveau_risque": "élevé",
  "seuil": 0.5
}
```

Notes d'implémentation:
- Le backend applique des mappings catégoriels depuis `backend/models/encoders.json`.
- Les valeurs inconnues basculent vers la catégorie fallback (`AUTRE`) quand elle existe.
- Le modèle pickle est chargé via Python (`backend/src/fraudModelRunner.py`) pour appeler `predict_proba`.
