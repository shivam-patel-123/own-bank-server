const express = require("express");
const accountController = require("../controllers/accountController");
const authController = require("../controllers/authController");

const router = express.Router();

router.route("/request-account").post(authController.createNewAccount);
router.route("/login").post(authController.loginWithEmailOrAccountNumber);

router
    .route("/")
    .get(accountController.getAllAccounts)
    .post(authController.protect, authController.createNewAccount);

router.route("/:accountNumber").get(accountController.getByAccountNumber);

module.exports = router;
