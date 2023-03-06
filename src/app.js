const express = require("express");
const cookieParser = require("cookie-parser");
const globalErrorHandlerMiddleware = require("./controllers/errorController");
const cors = require("cors");

const accountRouter = require("./routes/accountRoutes");

const staticFilesPath = "../public";

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

app.use(globalErrorHandlerMiddleware);
module.exports = app;
