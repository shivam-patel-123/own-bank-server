const express = require("express");

const accountRouter = require("./routes/accountRoutes");

const app = express();

app.use(express.json());
app.use("/api/v1/account", accountRouter);

module.exports = app;
