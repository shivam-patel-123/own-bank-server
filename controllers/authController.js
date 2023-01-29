const jwt = require("jsonwebtoken");
const validator = require("validator");
const bcrypt = require("bcrypt");

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

const fetchAccountFromCredentials = async (credentials) => {
    const { accountNumber, email, password } = credentials;

    if (!accountNumber && !email) {
        return {
            isExists: false,
            error: new AppError("Email or Account number is required", 400),
        };
    }

    if (!password) {
        return {
            isExists: false,
            error: new AppError("Password is required.", 400),
        };
    }

    let account = await Account.findOne({ accountNumber }).select("+password");
    if (!account) {
        let isValidEmail = validator.isEmail(email);
        if (!isValidEmail) {
            return {
                isExists: false,
                error: new AppError("Email entered is invalid", 400),
            };
        }
        account = await Account.findOne({ email }).select("+password");
    }

    if (!(await account?.checkPassword(password, account.password))) {
        return {
            isExists: false,
            error: new AppError(
                "Credientials provided is incorrect. Please check twice.",
                400
            ),
        };
    }

    const accountFromAccNo = await Account.findOne({ accountNumber });

    if (email && accountNumber && email !== accountFromAccNo?.email) {
        return {
            isExists: false,
            error: new AppError(
                `Email doesn't match with the account Number: "${accountNumber}"`,
                400
            ),
        };
    }

    return {
        isExists: true,
        account,
    };
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
    } = req.body;

    let linkedAccounts = req.body.linkedAccounts;

    if (accountRole == role.ADMIN || role.SUB_ADMIN) {
        // TODO: Prevent 'user' from Adding account as 'admin' or 'sub-admin' account.
    }

    // CHeck if linked account belongs to the user
    const accounts = await Promise.all(
        linkedAccounts.map(async (userDataObj) => {
            const { account, isExists } = await fetchAccountFromCredentials({
                accountNumber: userDataObj.accountNumber,
                email: userDataObj.email,
                password: userDataObj.password,
            });

            if (isExists) {
                return account.accountNumber;
            }
        })
    );

    linkedAccounts = accounts.filter((account) => account);

    const account = await Account.create({
        accountNumber,
        accountName,
        email,
        password,
        accountRole,
        totalAmount,
        totalPenalty,
        createdOn: new Date(),
        approvedBy,
        linkedAccounts,
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

exports.loginWithEmailOrAccountNumber = catchAsync(async (req, res, next) => {
    const { accountNumber, email, password } = req.body;

    const { account, error } = await fetchAccountFromCredentials({
        accountNumber,
        email,
        password,
    });

    if (error) {
        return next(error);
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
