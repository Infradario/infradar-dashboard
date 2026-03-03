# Infradar Dashboard

## Project
React/Vite/Tailwind dashboard for Kubernetes cluster monitoring.

## Architecture
- Agent (Go) collects 27+ K8s resource types, sends snapshots every 5min to API
- API (Go + PostgreSQL) stores snapshots, serves REST endpoints
- Dashboard connects to API, displays cluster data

## Run Locally
```bash
npm install
npm run dev
# Needs API running at localhost:8080
# Set VITE_API_URL=http://localhost:8080 in .env
```

## API Repo
- Clone: `git clone https://github.com/Infradario/infradar-api.git`
- Run: `docker-compose up -d && go run cmd/server/main.go`

## Auth
- Test login: `sectest@test.com` / `test1234`

## Key Files
- Pages: `src/pages/` (Dashboard, Clusters, ClusterDetail, ClusterMap, AppMesh, Security, Events, Alerts, Heatmap, GoldenSignals, Costs, AttackPaths, NSCompare, Simulator, BlastRadius, Timeline)
- API client: `src/lib/api.ts`
- Hooks: `src/hooks/` (usePolling, useAuth, useCluster, useTheme)
- Components: `src/components/` (Sidebar, LiveIndicator, Layout)
- CSS: `src/index.css`

## Completed Features
- Full K8s resource collection (27+ types, CRDs)
- Service mesh handler with 18 edge relationship types
- ArgoCD-style horizontal tree view (App Mesh)
- YAML manifest panel on resource click
- Light/dark mode
- Pan/zoom (trackpad + pinch)
- Real-time polling (usePolling hook, 30s/60s intervals, tab visibility pause)
- LiveIndicator (pulsing green dot + last updated time)
- ClusterMap namespace dropdown filter

## TODO
- Search/filter across all pages
- RBAC/User management
- Cluster comparison
- Export (PDF/PNG)
- Landing page

## User Preferences
- No co-author line in commits
- Azerbaijani language for communication
- Keep solutions simple, avoid over-engineering
