# Deployment Walkthrough

We have successfully configured the Zandar application (React Frontend + Express Backend) to run as a single Docker container.

## Changes Made
- **Created `Dockerfile`**: Defines a multi-stage build.
    1.  **Stage 1**: Builds the React frontend using Vite.
    2.  **Stage 2**: Sets up the Express backend and copies the built frontend assets to it.
- **Modified `backend/server.js`**:
    -   Added logic to serve the frontend static files from `../app/dist`.
    -   Added a catch-all route `/(.*)/` to support client-side routing (SPA).
- **Updated `package.json`**: Added convenience scripts (`install-all`, `build`, `start`) for local development without Docker.

## How to Deploy

### Using Docker (Recommended)

1.  **Build the Image**
    ```bash
    docker build -t zandar-app .
    ```

2.  **Run the Container**
    ```bash
    docker run -p 3001:3001 zandar-app
    ```

### Using Docker Compose

1.  **Start the Service**
    ```bash
    docker compose up -d --build
    ```
    This works identically to the manual docker run command, mapping port 3001.

3.  **Access the App**
    Open [http://localhost:3001](http://localhost:3001).

### Using Node.js Directly

If you prefer to run it without Docker (requires Node.js v20+):

1.  **Install Dependencies**
    ```bash
    npm run install-all
    ```

2.  **Build Frontend**
    ```bash
    npm run build
    ```

3.  **Start Backend**
    ```bash
    npm run start
    ```
    The app will be available at [http://localhost:3001](http://localhost:3001).

## Verification Results
- **Build Success**: The Docker image builds without errors.
- **Runtime Success**: The container starts and listens on port 3001.
- **Functionality**: The frontend loads correctly, and the backend API (link preview) is accessible on the same origin.
