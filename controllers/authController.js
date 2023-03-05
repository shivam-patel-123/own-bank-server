const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const validator = require("validator");

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const role = require("../constants/accountRoles");
const Account = require("../models/accountModel");

const validateAccountRole = (roleToValidate) => {
    for (const currRole in role) {
        if (role[currRole] === roleToValidate) {
            return role[currRole];
        }
    }
    return role.USER;
};

const sendCookie = (key, value, options, res) => {
    if (!options.expire) {
        options.expire = new Date(
            Date.now() + process.env.JWT_TOKEN_EXPIRY * 24 * 60 * 60 * 1000
        );
    }
    res.cookie(key, value, options);
};

const createAndSendToken = (data, res) => {
    const token = jwt.sign(data, process.env.JWT_TOKEN_SECRET, {
        expiresIn: process.env.JWT_TOKEN_EXPIRY,
    });

    sendCookie(
        "token",
        token,
        {
            httpOnly: true,
        },
        res
    );

    return token;
};

exports.fetchAccountFromCredentials = async (credentials) => {
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
        let isValidEmail = email && validator.isEmail(email);
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
    const loggedInAccountRole = req.account?.accountRole;
    const { accountNumber, accountName, email, password, totalAmount } =
        req.body;
    let { accountRole } = req.body;
    let approvedBy;

    // Make sure that the "accountRole" is either Admin, Sub-admin or User.
    accountRole = validateAccountRole(accountRole);

    // Prevent "user" from creating or requesting admin or sub-admin account.
    if (accountRole === role.ADMIN || accountRole === role.SUB_ADMIN) {
        return next(
            new AppError(
                "You can't create or request for admin or sub-admin role.",
                401
            )
        );
    }

    // Set "approvedBy" field.
    if (
        loggedInAccountRole &&
        (loggedInAccountRole === role.ADMIN ||
            loggedInAccountRole === role.SUB_ADMIN)
    ) {
        approvedBy = req.account?.accountNumber;
    }

    // Check if linked account belongs to a real user
    // const accounts = await Promise.all(
    //     linkedAccounts.map(async (userDataObj) => {
    //         const { account, isExists } = await fetchAccountFromCredentials({
    //             accountNumber: userDataObj.accountNumber,
    //             email: userDataObj.email,
    //             password: userDataObj.password,
    //         });

    //         if (isExists) {
    //             return account.accountNumber;
    //         }
    //     })
    // );

    // Set makes sure that "linkedAccounts" field doesn't have a duplicate value.
    // linkedAccounts = [...new Set(accounts.filter((account) => account))];

    let account = await Account.create({
        accountNumber,
        accountName,
        email,
        password,
        accountRole,
        totalAmount,
        createdOn: new Date(),
        approvedBy,
    });

    account.password = undefined;

    res.status(201).json({
        status: "success",
        data: {
            account,
        },
    });
});

exports.loginWithEmailOrAccountNumber = catchAsync(async (req, res, next) => {
    const { accountNumber, email, password } = req.body;

    let token, account;

    if ((accountNumber || email) && password) {
        const { account: userAccount, error } =
            await this.fetchAccountFromCredentials({
                accountNumber,
                email,
                password,
            });

        if (error) {
            return next(error);
        }

        if (
            userAccount?.accountRole !== role.ADMIN &&
            !userAccount?.approvedBy
        ) {
            return next(
                new AppError(
                    "Your account isn't approved. Wait for admin or sub-amdin to process your account request.",
                    401
                )
            );
        }

        account = userAccount;

        // Prevents from sending password field in response
        account.password = undefined;

        token = createAndSendToken(
            { accountNumber: account.accountNumber, email: account.email },
            res
        );
    } else if (req.cookies.token) {
        const tokenData = await promisify(jwt.verify)(
            req.cookies.token,
            process.env.JWT_TOKEN_SECRET
        );

        account = await Account.findOne({
            accountNumber: tokenData.accountNumber,
        });

        token = req.cookies.token;
        sendCookie("token", token, { httpOnly: true }, res);
    } else {
        return next(new AppError("Credentials was not provided", 400));
    }

    res.status(200).json({
        status: "success",
        token,
        data: {
            account,
        },
    });
});

exports.protect = catchAsync(async (req, res, next) => {
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return next(new AppError("You are not logged in.", 401));
    }

    const tokenData = await promisify(jwt.verify)(
        token,
        process.env.JWT_TOKEN_SECRET
    );

    const account = await Account.findOne({
        accountNumber: tokenData.accountNumber,
    });
    if (!account) {
        return next(new AppError("The account no longer exist.", 401));
    }

    req.account = account;
    next();
});
