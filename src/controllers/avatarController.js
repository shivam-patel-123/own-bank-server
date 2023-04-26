const multer = require("multer");
const { dirname, join } = require("path");
const fs = require("fs");
const config = require("../config");
const catchAsync = require("../utils/catchAsync");
const Account = require("../models/accountModel");
const accountController = require("./accountController");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/assets/images");
    },
    filename: function (req, file, cb) {
        const extension = file.mimetype.split("/")[1];
        const uniqueFileName = `user-${req.body.accountNumber}.${extension}`;
        cb(null, uniqueFileName);
    },
});

const upload = multer({ storage: storage });

exports.uploadProfilePicture = upload.single("profilePic");

exports.updateAccountProfilePic = catchAsync(async (req, res, next) => {
    const file = req.file;

    const filepath = join(dirname(require.main.filename), `../${config.STATIC_IMAGES_PATH}`, req.file.filename);

    fs.rename(file.path, filepath, function (err) {
        if (err) {
            console.log(err);
            return next(new AppError("Problem while saving file. Try again", 500));
        }
    });

    let updatedAccount = await Account.findOneAndUpdate(
        { accountNumber: req.body.accountNumber },
        {
            profilePicture: `${config.SERVER_IMAGES_URL}/${req.file.filename}`,
        },
        { new: true }
    );

    updatedAccount = await accountController.populateLinkedAccounts(updatedAccount, { accountNumber: 1, profilePicture: 1 });

    res.status(200).json({
        status: "success",
        data: {
            account: updatedAccount,
        },
    });
});
