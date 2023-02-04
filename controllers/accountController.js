const Account = require("../models/accountModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

const role = require("../constants/accountRoles");

const populateLinkedAccounts = async (account) => {
    if (!account.linkedAccounts) return account;

    const linkedAccountsData = await Promise.all(
        account.linkedAccounts.map(async (accountNumber) => {
            return await Account.findOne({ accountNumber }).select(
                "-linkedAccounts"
            );
        })
    );

    account = { ...account.toObject(), linkedAccounts: linkedAccountsData };
    return account;
};

exports.getAllAccounts = async (req, res) => {
    let accounts = await Account.find();

    accounts = await Promise.all(
        accounts.map(async (account) => await populateLinkedAccounts(account))
    );

    res.status(200).json({
        status: "success",
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
        return next(
            new AppError(
                `Can't find account with account number: "${accountNumber}"`,
                400
            )
        );
    }

    account = await populateLinkedAccounts(account);

    res.status(200).json({
        status: "success",
        data: {
            account,
        },
    });
};

exports.addLinkedAccounts = async (currentAccount, loggedInAccount) => {
    const { currentAccountNumber, linkedAccounts: linkedAccountNumbersList } =
        currentAccount;
    return await Promise.all(
        linkedAccountNumbersList.map(async (accountNumber) => {
            const updatedAccountNumberList = [
                currentAccountNumber,
                ...linkedAccountNumbersList,
            ];
            updatedAccountNumberList.splice(
                updatedAccountNumberList.indexOf(accountNumber),
                1
            );
            return await Account.findOneAndUpdate(
                {
                    accountNumber,
                },
                {
                    $addToSet: {
                        linkedAccounts: loggedInAccount.accountNumber,
                    },
                }
            );
        })
    );
};

exports.approveAccount = catchAsync(async (req, res, next) => {
    const {
        accountNumber: loggedInAccountNumber,
        accountRole: loggedInAccountRole,
    } = req.account || {};
    const { accountNumber } = req.body;

    if (!loggedInAccountRole) {
        return next(
            new AppError(
                "You are not logged in. Please login and try again.",
                401
            )
        );
    }

    if (
        loggedInAccountRole !== role.ADMIN &&
        loggedInAccountRole !== role.SUB_ADMIN
    ) {
        return next(
            new AppError(
                "You don't have permission to approve account(s).",
                403
            )
        );
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

    const linkedAccountDetails = await this.addLinkedAccounts(
        updatedAccount,
        req.account
    );

    res.status(200).json({
        status: "success",
        data: {
            account: {
                ...updatedAccount.toObject(),
                linkedAccounts: linkedAccountDetails,
            },
        },
    });
});
