const express = require("express");
const accountController = require("../contollers/accountController");
const authController = require("../contollers/authController");

const router = express.Router();

router
    .route("/")
    .get(accountController.getAllAccounts)
    .post(authController.createNewAccount);

router.route("/login").post(authController.loginWithEmail);
router.route("/:accountNumber").get(accountController.getByAccountNumber);

module.exports = router;
