const express = require("express");
const accountRoles = require("../constants/accountRoles");
const accountController = require("../controllers/accountController");
const authController = require("../controllers/authController");

const router = express.Router();

router.route("/request").post(authController.createNewAccount);
router.route("/login").post(authController.loginWithEmailOrAccountNumber);
router.route("/logout").get(authController.logout);

router.use(authController.protect);

router
    .route("/approve")
    .get(
        authController.restrictTo(accountRoles.ADMIN, accountRoles.SUB_ADMIN),
        accountController.getAccountsToApprove
    )
    .post(accountController.approveAccount);

router
    .route("/")
    .get(accountController.getAllAccounts)
    .post(authController.createNewAccount);

router.route("/:accountNumber").get(accountController.getByAccountNumber);

router.route("/").patch(accountController.updateAccount);

router.route("/link-accounts").post(accountController.insertLinkedAccounts);

module.exports = router;
