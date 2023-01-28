const Account = require("../models/accountModel");
const AppError = require("../utils/appError");

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

    if (!account) {
        return next(
            new AppError(
                `Can't find account with account Number: ${accountNumber}`
            )
        );
    }

    res.status(200).json({
        status: "success",
        data: {
            account,
        },
    });
};
