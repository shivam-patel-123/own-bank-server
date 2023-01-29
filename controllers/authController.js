const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const validator = require("validator");

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const role = require("../constants/accountRoles");
const Account = require("../models/accountModel");

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

const validateAccountRole = (roleToValidate) => {
    return !role[roleToValidate] ? role.USER : roleToValidate;
};

exports.createNewAccount = catchAsync(async (req, res, next) => {
    const loggedInAccountRole = req.account?.accountRole;
    const { accountNumber, accountName, email, password, totalAmount } =
        req.body;
    let { accountRole, linkedAccounts = [] } = req.body;
    let approvedBy;

    // Make sure that the "accountRole" is either Admin, Sub-admin or User.
    accountRole = validateAccountRole(accountRole);

    // Prevent "user" from creating or requesting admin or sub-admin account.
    if (accountRole === role.ADMIN || accountRole === role.SUB_ADMIN) {
        return next(
            new AppError(
                "You can't create/request for admin or sub-admin role.",
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

    // Set makes sure that "linkedAccounts" field doen't have a duplicate value.
    linkedAccounts = [...new Set(accounts.filter((account) => account))];

    const account = await Account.create({
        accountNumber,
        accountName,
        email,
        password,
        accountRole,
        totalAmount,
        createdOn: new Date(),
        approvedBy,
        linkedAccounts,
    });

    res.status(201).json({
        status: "success",
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

    // Prevents from sending password field in response
    account.password = undefined;

    const token = createAndSendToken(
        { accountNumber: account.accountNumber, email: account.email },
        res
    );

    req.user = account;

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
        console.log("IF", token);
    } else if (req.cookies.token) {
        token = req.cookies.token;
        console.log("ELSE IF", token);
    }

    if (!token) {
        console.log("TOKEN = ", token);
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
