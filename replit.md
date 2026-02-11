# Master Food Admin Dashboard

## Overview
A frontend-heavy admin dashboard for managing food ingredients via an external AWS Lambda API Gateway. The app acts as a proxy - all data lives on the user's AWS backend.

## Architecture
- **Frontend**: React + Vite + TailwindCSS + Shadcn UI components
- **Backend**: Express.js proxy server that forwards API calls to a configurable AWS API Gateway URL
- **No database**: This app has no local database. All data operations are proxied to the external AWS API.

## Key Features
1. **Search** - Search ingredients by name/nickname
2. **Create** - Register new food items (standard, mystery, cuisine types)
3. **Browse** - View items by digit range (1000s, 2000s, etc.)
4. **Edit** - Inline editing of food item details via dialog
5. **Delete** - Remove items with confirmation
6. **Nicknames** - Add alternative names to existing ingredients
7. **Migration** - Merge duplicate items (delete source, add as nickname to target)

## Project Structure
- `client/src/App.tsx` - Main app with sidebar layout and routing
- `client/src/components/app-sidebar.tsx` - Navigation sidebar
- `client/src/components/api-config-header.tsx` - API URL configuration dialog
- `client/src/components/edit-food-dialog.tsx` - Reusable edit dialog
- `client/src/components/theme-toggle.tsx` - Dark/light mode toggle
- `client/src/pages/` - All page components (search, create, browse, nicknames, migration)
- `client/src/lib/api-config.ts` - Zustand store for API URL (persisted to localStorage + synced to server)
- `server/routes.ts` - Express proxy routes forwarding to AWS API Gateway
- `shared/schema.ts` - TypeScript types and Zod schemas

## API Proxy Routes
All routes require the AWS API Gateway URL to be configured first via the settings dialog.
- `GET /api/search/:query` → AWS `/search?q=...`
- `GET /api/range/:digit` → AWS `/getxdigititems?digitNumber=...`
- `POST /api/food` → AWS `/createNewFood`, `/createMisteryFood`, or `/createCuisineFood`
- `PATCH /api/fooditem` → AWS `/patch/fooditem`
- `DELETE /api/ingredient` → AWS `/delete/ingredient`
- `POST /api/nickname` → AWS `/addNickname`
- `POST /api/migration` → AWS `/migrationIngredientToNickname`

## Running
`npm run dev` starts both the Express backend and Vite frontend on port 5000.
