const mongoose = require("mongoose");
const validator = require("validator");
const role = require("../constants/accountRoles");

const accountSchema = new mongoose.Schema({
    account_number: {
        type: String,
        unique: true,
        required: [true, "Account can't be created without a number."],
    },
    account_name: {
        type: String,
        required: [true, "Account must have a name."],
    },
    email: {
        type: String,
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, "Enter a valid email."],
    },
    password: {
        type: String,
        minLength: 8,
        required: [true, "Account must be secure with a password."],
        select: false,
    },
    account_role: {
        type: String,
        enum: [role.ADMIN, role.SUB_ADMIN, role.USER],
        default: "user",
    },
    total_amount: {
        type: Number,
        default: 0,
    },
    total_penalty: {
        type: Number,
        default: 0,
    },
    created_on: {
        type: Date,
        required: [true, "Please provide a date of account creation."],
    },
    approved_by: {
        type: mongoose.Schema.Types.ObjectId,
    },
    linked_accounts: {
        type: [mongoose.Schema.Types.ObjectId],
    },
});

module.exports = mongoose.model("Account", accountSchema);
