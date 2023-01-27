const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");

const role = require("../constants/accountRoles");

const accountSchema = new mongoose.Schema({
    accountNumber: {
        type: String,
        unique: true,
        required: [true, "Account can't be created without a number."],
    },
    accountName: {
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
    accountRole: {
        type: String,
        enum: [role.ADMIN, role.SUB_ADMIN, role.USER],
        default: "user",
    },
    totalAmount: {
        type: Number,
        default: 0,
    },
    totalPenalty: {
        type: Number,
        default: 0,
    },
    createdOn: {
        type: Date,
        required: [true, "Please provide a date of account creation."],
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
    },
    linkedAccounts: {
        type: [mongoose.Schema.Types.ObjectId],
    },
});

accountSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 12);
    console.log(this.password);
    next();
});

accountSchema.methods.checkPassword = async function (
    plainPassword,
    hashedPassword
) {
    return await bcrypt.compare(plainPassword, hashedPassword);
};

module.exports = mongoose.model("Account", accountSchema);
