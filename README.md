# Gesti-Fact — Gestion de factures

Application de facturation professionnelle :

- **Backend** : Django 5 + Django REST Framework + JWT, base **PostgreSQL**, génération **PDF** (ReportLab)
- **Frontend** : React Native (**Expo SDK 58** + Expo Router) → Android, iOS et **Web installable (PWA)**

## Fonctionnalités

| Fonction | Détail |
|---|---|
| Facture | Logo de l'entreprise à gauche, **Doit à** en dessous ; à droite **Facture N°**, **Date**, **Téléphone**, **Email** |
| Numérotation | Automatique, unique et continue par année : `FAC-2026-0001`, `FAC-2026-0002`… (préfixe modifiable) |
| Lignes | **Désignation**, **Quantité**, **Prix unitaire**, **Montant = Qté × PU** (calcul en direct) |
| TVA | Taux variable par facture (0 %, 9 %, 18 % ou libre), taux par défaut dans les paramètres |
| Arrêté | « *Arrêtée la présente facture à la somme de : …* » généré automatiquement en lettres depuis le Net à payer TTC |
| Signature | Titre + image de signature/cachet + nom du signataire en bas à droite |
| PDF | Design professionnel A4 (bandeau, tableau, totaux, pied de page RCCM/NCC), ouverture web ou partage mobile |
| Clients | Carnet clients pour remplir « Doit à » en un clic |
| Espace développeur | Utilisateurs **en ligne en temps réel**, dernière activité, connexions, échecs de connexion, nombre de factures, activation/désactivation des comptes, gestion des rôles |

## Arborescence

```
Gesti-Fact/
├── docker-compose.yml        # PostgreSQL
├── backend/                  # Django
│   ├── config/               # settings, urls
│   ├── accounts/             # utilisateurs, JWT, présence en ligne, espace développeur
│   └── invoices/             # entreprise, clients, factures, PDF (pdf.py), montant en lettres (utils.py)
└── frontend/                 # Expo / React Native
    ├── app/                  # écrans (Expo Router)
    │   ├── (tabs)/           # Accueil, Factures, Clients, Paramètres, Développeur
    │   └── invoice/          # nouvelle, détail/aperçu, modification
    ├── src/                  # api, auth, composants, thème
    └── public/               # PWA : manifest.json, sw.js, icônes
```

## 1. Base de données PostgreSQL

Avec un PostgreSQL installé (Windows : service `postgresql-x64-18`) : créez une base `gestifact` :

```bash
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -c "CREATE DATABASE gestifact;"
```

Ou avec Docker (optionnel) : `docker compose up -d`.

## 2. Backend Django

```bash
cd backend
py -3.11 -m venv .venv          # ⚠ Python 3.11 à 3.13 (pas 3.15 : Pillow/psycopg n'ont pas encore de paquets)
.venv\Scripts\activate            # Windows   (Linux/macOS : source .venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env            # puis adaptez les identifiants PostgreSQL
python manage.py migrate
python manage.py createsuperuser  # ce compte a automatiquement accès à l'espace développeur
python manage.py runserver 0.0.0.0:8000
```

- API : http://localhost:8000/api/
- Administration Django : http://localhost:8000/admin/

> `0.0.0.0` est nécessaire pour que le téléphone (Expo Go) puisse joindre l'API sur le réseau local.

## 3. Frontend (mobile + web)

```bash
cd frontend
npm install
npx expo start          # puis : w = web, a = Android, i = iOS, ou scannez le QR code avec Expo Go
```

L'URL de l'API est détectée automatiquement (web : `http://<hôte>:8000/api`, mobile : IP du PC). En production, définissez `EXPO_PUBLIC_API_URL` (voir `frontend/.env.example`).

### Version PWA (web installable)

```bash
cd frontend
npm run build:web       # génère le dossier dist/
npx serve dist --single # ou publiez dist/ sur Netlify, Vercel, Nginx…
```

Ouvrez le site dans Chrome/Edge → « Installer l'application ». Sur iPhone : Safari → Partager → « Sur l'écran d'accueil ».
En production, la PWA doit être servie en **HTTPS** et l'origine ajoutée à `CORS_ALLOWED_ORIGINS`.

## Espace développeur

Accessible aux comptes avec le rôle **Développeur** (ou superutilisateur). Un développeur peut nommer d'autres développeurs depuis l'espace lui-même.

- Un utilisateur est **en ligne** s'il a fait une requête dans les `ONLINE_WINDOW_MINUTES` dernières minutes (5 par défaut) et ne s'est pas déconnecté.
- La page se rafraîchit toute seule toutes les 15 secondes.

## API (résumé)

| Méthode | URL | Rôle |
|---|---|---|
| POST | `/api/auth/register/` · `/api/auth/login/` · `/api/auth/logout/` · `/api/auth/refresh/` | Authentification JWT |
| GET/PATCH | `/api/auth/me/` | Profil |
| GET/PATCH | `/api/company/` | Entreprise (multipart pour logo/signature) |
| CRUD | `/api/clients/` | Clients |
| CRUD | `/api/invoices/` | Factures (lignes imbriquées, totaux calculés serveur) |
| GET | `/api/invoices/{id}/pdf/` (`?download=1`) | PDF |
| GET | `/api/invoices/stats/` | Tableau de bord |
| GET | `/api/amount-in-words/?amount=` | Montant en lettres |
| GET | `/api/dev/stats/` · `/api/dev/users/` · `/api/dev/events/` | Espace développeur |
| PATCH | `/api/dev/users/{id}/` | Activer/désactiver, rôle |
# Gesti-Fact
