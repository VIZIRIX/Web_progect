import "dotenv/config";
import { createApp } from "./app.js";
import { logger } from "./utils/logger.js";

const PORT = process.env.PORT || 5000;
const app = createApp();

app.listen(PORT, () => {
    logger.info(`Server successfully started on port ${PORT}`, {
        port: PORT,
        env: process.env.NODE_ENV || "development",
    });
});
