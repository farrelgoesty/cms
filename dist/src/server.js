"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const server = app_1.app.listen(env_1.env.PORT, () => {
    console.log(`CMS Blog running on http://localhost:${env_1.env.PORT}`);
});
server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
        console.error(`Port ${env_1.env.PORT} is already in use. Stop the process using that port, then run npm run dev again.`);
        process.exit(1);
    }
    throw error;
});
