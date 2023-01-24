const mongoose = require("mongoose");
require("dotenv").config();

const app = require("./app");
const PORT = process.env.PORT || 6001;

const MONGO_STRING = process.env.MONGODB_STRING;

// CONNECT TO MONGODB DATABASE
mongoose.connect(MONGO_STRING);
const database = mongoose.connection;

database.on("error", (err) => {
    console.log(err);
});

database.once("connected", () => {
    console.log("===== DATABASE CONNECTION SUCCESSFUL =====");
});

app.listen(PORT, () => {
    console.log(`OWN BANK SERVER IS RUNNING ON PORT: ${PORT}`);
});
