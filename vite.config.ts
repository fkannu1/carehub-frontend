// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      // forward /api/* -> Django dev server
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: false,
        secure: false,
      },
    },
    hmr: { overlay: true },
  },

  // ✅ Skip dep pre-bundling of FullCalendar to avoid missing "./index.css" lookups.
  // We load our own CSS from src/styles/fullcalendar.css instead.
  optimizeDeps: {
    exclude: [
      "@fullcalendar/core",
      "@fullcalendar/daygrid",
      "@fullcalendar/timegrid",
      "@fullcalendar/interaction",
      "@fullcalendar/react",
    ],
  },

  // (Optional but helpful) keep FullCalendar internal during SSR builds too
  ssr: {
    noExternal: [
      "@fullcalendar/core",
      "@fullcalendar/daygrid",
      "@fullcalendar/timegrid",
      "@fullcalendar/interaction",
      "@fullcalendar/react",
    ],
  },
});
