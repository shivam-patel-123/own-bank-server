const express = require("express");

const accountRouter = express.Router();

accountRouter.route("/").get((req, res) => {
    res.send("Hello Folks !!!");
});

module.exports = accountRouter;
