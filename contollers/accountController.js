const jwt = require("jsonwebtoken");

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
        // TODO: Prevent User from Adding 'admin' or 'sub-admin' account.
    }

    const account = await Account.create({
        account_number: accountNumber,
        account_name: accountName,
        email,
        password,
        account_role: accountRole,
        total_amount: totalAmount,
        total_penalty: totalPenalty,
        created_on: new Date(),
        approved_by: approvedBy,
        linked_accounts: linkedAccounts,
    });

    const token = createAndSendToken(
        { account_number: accountNumber, email },
        res
    );

    res.status(201).json({
        status: "success",
        token,
        data: {
            account,
        },
    });
};

exports.getAllAccounts = async (req, res) => {
    const accounts = await Account.find();

    res.status(200).json({
        status: "success",
        data: {
            accounts,
        },
    });
};

exports.getByAccountNumber = async (req, res) => {
    const accountNumber = req.params.accountNumber;

    const account = await Account.findOne({
        account_number: { $eq: accountNumber },
    });

    res.status(200).json({
        status: "success",
        data: {
            account,
        },
    });
};
