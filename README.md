# Zandar 

**A local-first, privacy-focused & highly customizable browser startpage**.
An open-source alternative to StartMe.

![Zandar preview](images/preview.png)
*(New tab view showing the dashboard)*


![Settings Preview](images/two.png)
*(Settings Preview)*



---

## Features (current MVP):

- Local-first storage (IndexedDB + browser localstorage)
- No login or account required
- Fast local search across saved links
- Auto-fetch page titles and favicons
- Import / export (JSON backup)
- Drag & drop layout for links and widgets
- Multi-column grid control
- Background presets (image)
- Support for local background images and Videos
- Dark-only, calm UI

---

## Self-Hosting / Development Setup - Docker
Using Docker (Recommended)
Build the Image

docker build -t zandar-app .
Run the Container

docker run -p 3001:3001 zandar-app
Using Docker Compose
Start the Service

docker compose up -d --build
This works identically to the manual docker run command, mapping port 3001.

Access the App Open http://localhost:3001.
---

## Self-Hosting / Development Setup - Node
Using Node.js Directly
If you prefer to run it without Docker (requires Node.js v20+):

Install Dependencies

npm run install-all
Build Frontend

npm run build
Start Backend

npm run start
The app will be available at http://localhost:3001.


---





