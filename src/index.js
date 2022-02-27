const express = require("express");
const app = express();
const dotenv = require("dotenv");
const cors = require("cors");

const paymentsRoutes = require("./routes/payments");

app.use(cors());
app.use(express.json({ extended: false }));

app.use("/payments", paymentsRoutes);

const PORT = process.env.PORT || 6000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
