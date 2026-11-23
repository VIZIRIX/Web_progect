import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, "index.html"),
                calendar: resolve(__dirname, "calendar/booking.html"),
                booking: resolve(__dirname, "booking/booking.html"),
                manager: resolve(__dirname, "manager/manager.html"),
                admin: resolve(__dirname, "admin/admin.html"),
            },
        },
    },
    server: {
        host: "0.0.0.0",
        port: 5173,
        proxy: {
            "/api": {
                target: "http://backend:5000",
                changeOrigin: true,
                secure: false,
            },
        },
    },
});
