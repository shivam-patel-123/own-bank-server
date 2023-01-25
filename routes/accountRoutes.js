const express = require("express");
const accountController = require("../contollers/accountController");

const router = express.Router();

router
    .route("/")
    .get(accountController.getAllAccounts)
    .post(accountController.createNewAccount);

router.route("/:accountNumber").get(accountController.getByAccountNumber);

module.exports = router;
