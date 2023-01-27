const jwt = require("jsonwebtoken");
const validator = require("validator");

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

exports.createNewAccount = async (req, res) => {
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
};

exports.loginWithEmail = async (req, res) => {
    const { email, password } = req.body;

    if ((!email, !password)) {
        return new Error("Email and Password can't be empty.");
    }

    if (!validator.isEmail(email)) {
        return new Error("Invalid email entered");
    }

    const account = await Account.findOne({ email }).select("+password");
    console.log(account);

    if (!account || account.password !== password) {
        return new Error("Email or Password is incorrect");
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
};
