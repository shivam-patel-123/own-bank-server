const Account = require("../models/accountModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const { fetchAccountFromCredentials } = require("../controllers/authController");

const role = require("../constants/accountRoles");
const accountRoles = require("../constants/accountRoles");

exports.populateLinkedAccounts = async (account, populatefields) => {
    if (!account.linkedAccounts) return account;

    const linkedAccountsData = await Promise.all(
        account.linkedAccounts.map(async (accountNumber) => {
            return await Account.findOne({ accountNumber }).select({ ...populatefields });
        })
    );

    account = { ...account.toObject(), linkedAccounts: linkedAccountsData };
    return account;
};

exports.getAllAccounts = async (req, res) => {
    let accounts = await Account.find();

    accounts = await Promise.all(accounts.map(async (account) => await this.populateLinkedAccounts(account)));

    res.status(200).json({
        status: "success",
        total: accounts.length,
        data: {
            accounts,
        },
    });
};

exports.getByAccountNumber = async (req, res, next) => {
    const accountNumber = req.params.accountNumber;

    let account = await Account.findOne({
        accountNumber: { $eq: accountNumber },
    });

    if (!account) {
        return next(new AppError(`Can't find account with account number: "${accountNumber}"`, 400));
    }

    account = await populateLinkedAccounts(account);

    res.status(200).json({
        status: "success",
        data: {
            account,
        },
    });
};

exports.getAccountsToApprove = catchAsync(async (_, res, next) => {
    const accounts = await Account.find({
        approvedBy: undefined,
        accountRole: { $ne: accountRoles.ADMIN },
    });

    res.status(200).json({
        status: "success",
        totalResults: accounts.length,
        data: {
            accounts,
        },
    });
});

exports.addLinkedAccounts = async (...accounts) => {
    let totalLinkedAccountsList = accounts.reduce((accumulator, account) => {
        accumulator.push(account.accountNumber, ...account.linkedAccounts);
        return accumulator;
    }, []);

    totalLinkedAccountsList = [...new Set(totalLinkedAccountsList)];

    return await Promise.all(
        totalLinkedAccountsList.map(async (accNumber) => {
            const copy = [...totalLinkedAccountsList];

            const indexOfCurrentAccount = totalLinkedAccountsList.indexOf(accNumber);

            copy.splice(indexOfCurrentAccount, 1);

            const updatedAccount = await Account.findOneAndUpdate(
                {
                    accountNumber: accNumber,
                },
                {
                    $set: {
                        linkedAccounts: copy,
                    },
                },
                {
                    new: true,
                }
            ).select("-linkedAccounts");

            copy.splice(indexOfCurrentAccount, 0, accNumber);

            return updatedAccount;
        })
    );
};

exports.approveAccount = catchAsync(async (req, res, next) => {
    const { accountNumber: loggedInAccountNumber, accountRole: loggedInAccountRole } = req.account || {};
    const { accountNumber } = req.body;

    if (!loggedInAccountRole) {
        return next(new AppError("You are not logged in. Please login and try again.", 401));
    }

    if (loggedInAccountRole !== role.ADMIN && loggedInAccountRole !== role.SUB_ADMIN) {
        return next(new AppError("You don't have permission to approve account(s).", 403));
    }

    if (loggedInAccountNumber === accountNumber) {
        return next(new AppError("You can't approve your own account", 403));
    }

    let updatedAccount = await Account.findOneAndUpdate(
        { accountNumber },
        {
            $set: { approvedBy: loggedInAccountNumber },
        },
        { new: true }
    );

    res.status(200).json({
        status: "success",
        data: {
            account: {
                updatedAccount,
                // linkedAccounts: linkedAccountDetails,
            },
        },
    });
});

exports.updateAccount = catchAsync(async (req, res, next) => {
    const loggedInAccountNumber = req.account?.accountNumber;

    const editableFields = ["accountName", "totalAmount", "totalPenalty"];

    for (const property in req.body) {
        if (!editableFields.includes(property)) {
            req.body[property] = undefined;
        }
    }

    const account = await Account.findOneAndUpdate({ accountNumber: loggedInAccountNumber }, req.body, {
        new: true,
    });

    res.status(200).json({
        status: "success",
        data: {
            account,
        },
    });
});

exports.insertLinkedAccounts = catchAsync(async (req, res, next) => {
    const clientData = req.body.accountsToLink;

    if (clientData.length === 0) {
        return next(new AppError("Account Authentication data was not provided.", 400));
    }

    let accounts = await Promise.all(
        req.body.accountsToLink?.map(
            async ({ accountNumber, email, password }) =>
                await fetchAccountFromCredentials({
                    accountNumber,
                    email,
                    password,
                })
        )
    );

    accounts = accounts.filter(({ isExists }) => isExists).map(({ account }) => account);

    if (accounts.length === 0) {
        return next(new AppError("Credentials provided is incorrect. Please try again!", 400));
    }

    const allLinkedAccounts = await this.addLinkedAccounts(...accounts, req.account);

    res.status(200).json({
        status: "success",
        data: {
            accounts: allLinkedAccounts,
        },
    });
});

exports.switchAccount = catchAsync(async (req, res, next) => {
    const { accountNumber } = req.body;
    const loggedInAccountNumber = req.account?.accountNumber;

    if (!loggedInAccountNumber) {
        return next(new AppError("You are not logged in."));
    }

    const account = await Account.findOne({ accountNumber });

    res.status(200).json({
        status: "success",
        data: {
            account,
        },
    });
});
