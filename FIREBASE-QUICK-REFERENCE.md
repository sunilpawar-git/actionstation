# Firebase Quick Commands Reference

## Essential Firebase CLI Commands

```bash
# PROJECT & AUTH
npx -y firebase-tools@latest --version          # Check CLI version
npx -y firebase-tools@latest login               # Authenticate
npx -y firebase-tools@latest use                 # Show active project
npx -y firebase-tools@latest projects:list       # List all projects

# DEPLOYMENT
npx -y firebase-tools@latest deploy                           # Deploy all services
npx -y firebase-tools@latest deploy --only hosting            # Deploy hosting only
npx -y firebase-tools@latest deploy --only functions          # Deploy functions only
npx -y firebase-tools@latest deploy --only firestore:rules    # Deploy Firestore rules
npx -y firebase-tools@latest deploy --dry-run                 # Preview deployment

# FUNCTIONS MANAGEMENT
npx -y firebase-tools@latest functions:list                   # List deployed functions
npx -y firebase-tools@latest functions:log                    # View function logs
npx -y firebase-tools@latest functions:log --limit=50         # Last 50 log entries
npx -y firebase-tools@latest functions:log --follow           # Stream live logs

# FIRESTORE
npx -y firebase-tools@latest firestore:indexes                # View indexes config
npx -y firebase-tools@latest firestore:delete-collection \
  --recursive -y {collection-name}                            # Delete collection (careful!)

# STORAGE
npx -y firebase-tools@latest storage:set-rules                # Deploy storage rules manually

# LOCAL EMULATION
npx -y firebase-tools@latest emulators:start                  # Start local emulators
npx -y firebase-tools@latest emulators:exec \                 # Run script then shutdown
  "npm test"
npx -y firebase-tools@latest emulators:export ./backup        # Export emulator data
npx -y firebase-tools@latest emulators:import ./backup        # Import emulator data

# VALIDATION
firebase validate                                # Validate firebase.json syntax
firebase hosting:channel:deploy feature-x       # Deploy to preview channel
firebase hosting:channel:delete feature-x       # Delete preview channel
```

## Project-Specific Configuration

**Current Project:** `actionstation-244f0`
**Active Services:**
- ✅ Hosting (Firebase Hosting)
- ✅ Firestore (Cloud Firestore)
- ✅ Storage (Cloud Storage)
- ✅ Functions (Cloud Functions, Node 22)
- ✅ Emulators (Local dev)

## Quick Health Checks

```bash
# Full check suite (from project root)
npm run check                   # typecheck + lint + test

# Build verification
npm run build                   # Full build with all checks

# Security audit
npm audit                       # Check for vulnerabilities

# Cloud Functions check
cd functions && npm run check   # Functions-specific checks
```

## Pre-Deployment Checklist

```bash
# 1. Update code and commit
git add .
git commit -m "feature: description"

# 2. Run all checks
npm run build

# 3. Verify no breaking changes
npm audit
cd functions && npm audit

# 4. Preview deployment
npx -y firebase-tools@latest deploy --dry-run

# 5. Deploy to production
npx -y firebase-tools@latest deploy --project actionstation-244f0

# 6. Verify deployment
npx -y firebase-tools@latest functions:list
npx -y firebase-tools@latest functions:log --limit=20
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Login fails** | `npx -y firebase-tools@latest login --no-localhost` |
| **Wrong project active** | `npx -y firebase-tools@latest use --add actionstation-244f0` |
| **Deployment hangs** | Check network, try `--only hosting` or `--only functions` separately |
| **firebase.json syntax error** | `firebase validate` |
| **Function not updating** | `npx -y firebase-tools@latest functions:list` to verify deployment completed |
| **Emulator port in use** | Change port in `firebase.json` emulators config |

## Environment Setup

```bash
# First-time setup
cp .env.example .env.local
# Fill in all VITE_* variables with your Firebase credentials

# Verify variables loaded
cat .env.local | grep VITE_
```

## Useful Resources

- Firebase Console: https://console.firebase.google.com/project/actionstation-244f0
- Cloud Functions Dashboard: https://console.cloud.google.com/functions
- Firestore Console: https://console.firebase.google.com/project/actionstation-244f0/firestore
- This report: `FIREBASE-HEALTH-REPORT.md`
