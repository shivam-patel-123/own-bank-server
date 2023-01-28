const express = require("express");
const cookieParser = require("cookie-parser");
const globalErrorHandlerMiddleware = require("./contollers/errorController");

const accountRouter = require("./routes/accountRoutes");

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/account", accountRouter);

app.use(globalErrorHandlerMiddleware);
module.exports = app;
