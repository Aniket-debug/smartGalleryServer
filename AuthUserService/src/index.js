require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const checkAuth = require("./middlewares/checkAuth");
const authRouter = require("./routes/authRoutes");
const userRouter = require("./routes/userRoutes");
const galleryRouter = require("./routes/galleryRoutes");

const app = express();

// Connect to MongoDB

mongoose
  .connect(process.env.DB_URL_ATLAS)
  .then(() => console.log("MongoDB connected!"))
  .catch((e) => console.error("MongoDB Error:", e));

// Middlewares

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(checkAuth);


// ----- Routes -----

app.get("/", (req, res) => {
  res.json({ message: "Welcome!", user: req.user });
});

app.use(authRouter);

app.use("/user", userRouter);

app.use("/gallery", galleryRouter);

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server started on port ${process.env.PORT}`);
});
