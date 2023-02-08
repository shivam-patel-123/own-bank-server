const express = require("express");
const accountController = require("../controllers/accountController");
const authController = require("../controllers/authController");

const router = express.Router();

router.route("/request").post(authController.createNewAccount);
router.route("/login").post(authController.loginWithEmailOrAccountNumber);

router.use(authController.protect);

router.route("/approve").post(accountController.approveAccount);

router
    .route("/")
    .get(accountController.getAllAccounts)
    .post(authController.createNewAccount);

router.route("/:accountNumber").get(accountController.getByAccountNumber);

router.route("/").patch(accountController.updateAccount);

router.route("/link-accounts").post(accountController.insertLinkedAccounts);

module.exports = router;
