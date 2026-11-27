# ATHENA.IDE Official Website (Frontend)

Isolated React + TypeScript + Vite frontend for the official **ATHENA.IDE** website (`website/`), developed on branch `chandan-dev`.

## Quickstart

```bash
cd website
npm install
npm run dev
```

## Scripts

- `npm run dev` — Start Vite development server on port `5174`
- `npm run build` — Type-check (`tsc -b`) and build production bundle (`dist/`)
- `npm run preview` — Preview production build locally
- `npm test` — Run unit tests via Vitest

## Backend Integration

Release data is consumed exclusively through `src/services/releaseAdapter.ts` (`ReleaseDataAdapter`).
See [FRONTEND_API_CONTRACT.md](./FRONTEND_API_CONTRACT.md) for the REST/JSON contract and TypeScript interfaces.

Set `VITE_API_BASE_URL` to switch from `MockReleaseAdapter` to `HttpReleaseAdapter`.
