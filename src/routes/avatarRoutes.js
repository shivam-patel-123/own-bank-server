const express = require("express");

const router = express.Router();

const {
    uploadProfilePicture,
    updateAccountProfilePic,
} = require("../controllers/avatarController");

router.route("/").post(uploadProfilePicture, updateAccountProfilePic);

module.exports = router;
