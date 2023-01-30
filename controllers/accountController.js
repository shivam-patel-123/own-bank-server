const Account = require("../models/accountModel");
const AppError = require("../utils/appError");

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

exports.addLinkedAccounts = async (
    currentAccount,
    linkedAccountNumbersList
) => {
    await Promise.all(
        linkedAccountNumbersList.map(async (accountNumber) => {
            const updatedAccountNumberList = [
                currentAccount,
                ...linkedAccountNumbersList,
            ];
            updatedAccountNumberList.splice(
                updatedAccountNumberList.indexOf(accountNumber),
                1
            );
            await Account.updateOne(
                {
                    accountNumber,
                },
                {
                    $addToSet: {
                        linkedAccounts: updatedAccountNumberList,
                    },
                }
            );
        })
    );
};
