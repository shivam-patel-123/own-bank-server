const jwt = require("jsonwebtoken");
const validator = require("validator");

const AppError = require("../utils/appError");
const role = require("../constants/accountRoles");
const Account = require("../models/accountModel");

const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

const createAndSendToken = (data, res) => {
    const expiryInMilliseconds = new Date(
        Date.now() + process.env.JWT_TOKEN_EXPIRY * 24 * 60 * 60 * 1000
    );
    const token = jwt.sign(data, process.env.JWT_TOKEN_SECRET, {
        expiresIn: process.env.JWT_TOKEN_EXPIRY,
    });

    res.cookie("token", token, {
        expire: expiryInMilliseconds,
        httpOnly: true,
    });

    return token;
};

exports.createNewAccount = catchAsync(async (req, res, next) => {
    const {
        accountNumber,
        accountName,
        email,
        password,
        accountRole,
        totalAmount,
        totalPenalty,
        approvedBy,
        linkedAccounts,
    } = req.body;

    if (accountRole == role.ADMIN || role.SUB_ADMIN) {
        // TODO: Prevent 'user' from Adding account as 'admin' or 'sub-admin' account.
    }

    const account = await Account.create({
        accountNumber: accountNumber,
        accountName: accountName,
        email,
        password,
        accountRole: accountRole,
        totalAmount: totalAmount,
        totalPenalty: totalPenalty,
        createdOn: new Date(),
        approvedBy: approvedBy,
        linkedAccounts: linkedAccounts,
    });

    const token = createAndSendToken({ accountNumber, email }, res);

    res.status(201).json({
        status: "success",
        token,
        data: {
            account,
        },
    });
});

const loginWithEmail = async (email) => {
    let isValidEmail = validator.isEmail(email);
    if (!isValidEmail) {
        return new AppError("Email entered is invalid", 400);
    }

    return await Account.findOne({ email }).select("+password");
};

exports.loginWithEmailOrAccountNumber = catchAsync(async (req, res, next) => {
    const { accountNumber, email, password } = req.body;

    if (!accountNumber && !email) {
        return next(new AppError("Email or Account number is required", 400));
    }

    if (!password) {
        return next(new AppError("Password is required.", 400));
    }

    let account = await Account.findOne({ accountNumber }).select("+password");
    if (!account) {
        account = await loginWithEmail(email);
    }

    if (
        !account ||
        !(await account?.checkPassword(password, account.password))
    ) {
        return next(
            new AppError(
                "Credientials provided is incorrect. Please check twice.",
                400
            )
        );
    }

    const a = await Account.findOne({ accountNumber });

    if (email !== a?.email) {
        return next(
            new AppError(
                `Email doesn't match with the account Number: "${accountNumber}"`,
                400
            )
        );
    }
    account.password = undefined;

    const token = createAndSendToken(
        { accountNumber: account.accountNumber, email: account.email },
        res
    );

    res.status(200).json({
        status: "success",
        token,
        data: {
            account,
        },
    });
});
