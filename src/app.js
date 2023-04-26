const express = require("express");
const cookieParser = require("cookie-parser");
const globalErrorHandlerMiddleware = require("./controllers/errorController");
const cors = require("cors");

const config = require("./config");
const accountRouter = require("./routes/accountRoutes");
const avatarRouter = require("./routes/avatarRoutes");

const staticFilesPath = `../${config.STATIC_PATH}`;

const app = express();

app.use(express.static(staticFilesPath));

app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin: ["http://localhost:3000"],
        credentials: true,
        methods: ["GET", "PUT", "POST", "DELETE"],
    })
);

app.use("/api/v1/account", accountRouter);
app.use("/api/v1/avatar", avatarRouter);

app.use(globalErrorHandlerMiddleware);
module.exports = app;
