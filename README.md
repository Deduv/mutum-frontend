# DevBoard Frontend

## Short Description
A clean, elegant, and modern web interface for the DevBoard application, a system designed for managing projects and tasks. This frontend prototype is built with a minimalist, Apple-like design aesthetic to ensure a professional and distraction-free user experience.

## Current Status
**Stage:** Initial Prototype / Foundation
Currently, the project contains the foundational UI Design System and Theme System (Light/Dark mode) with atomic components (Button, Input, Card). The showcase is actively being developed before full API integration.

## Backend Integration
This frontend application is specifically designed to consume the **DevBoard API** currently published in production.
* **Backend API URL:** [https://api.labprojects.dev.br](https://api.labprojects.dev.br)
* **API Documentation (Swagger):** [https://api.labprojects.dev.br/docs](https://api.labprojects.dev.br/docs)

## Tech Stack
- **Core:** React, TypeScript
- **Build Tool:** Vite
- **Styling:** CSS Modules (Vanilla CSS)
- **Routing:** React Router DOM (upcoming)
- **Network:** Native Fetch API

## Local Development Instructions
To run this project locally on your machine:

1. Clone the repository.
2. Navigate into the project folder: `cd devboard-frontend`
3. Install the dependencies: 
   ```bash
   npm install
   ```
4. Start the local development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to the URL provided by Vite (usually `http://localhost:5173`).

## Available Scripts
- `npm run dev`: Starts the development server.
- `npm run build`: Compiles the application and runs the TypeScript compiler to catch any errors.
- `npm run preview`: Bootstraps a local web server to preview the production build.

## Project Structure
```text
src/
 ├─ components/    # Reusable UI components (Button, Input, Card, ThemeToggle)
 ├─ hooks/         # Custom React hooks (e.g., useTheme)
 ├─ styles/        # Future global CSS extensions
 ├─ App.tsx        # Application entry point / Current Design Showcase
 ├─ index.css      # Design tokens (variables) and global CSS reset
 └─ main.tsx       # React root DOM injector
```

## Design Goals
- **Apple-like Aesthetic:** Clean, minimalist, extensive white space, and subtle depth.
- **No Emojis:** Purely professional typographic interface.
- **Native Theme Support:** Seamless Light and Dark mode managed natively via CSS variables and `localStorage`.
- **Zero UI Libraries:** Built without heavy abstractions like Tailwind, MUI, or Bootstrap to ensure total control and a light bundle.

## Next Steps
- Setup React Router for page navigation.
- Implement Authentication (Login Screen & JWT management).
- Implement Dashboard Layout (Header, Sidebar).
- Integrate with Backend API to perform CRUD operations on Projects and Tasks.
