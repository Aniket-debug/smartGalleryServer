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
  .connect(process.env.DB_URL)
  .then(() => console.log("MongoDB connected!"))
  .catch((e) => console.error("MongoDB Error:", e));

// Middlewares

app.use(express.json());          // Parse JSON body
app.use(cookieParser());          // Parse cookies

app.use(checkAuth);

// ----- Home Route -----

app.get("/", (req, res) => {
  res.json({ message: "Welcome!", user: req.user });
});

// ----- Auth Routes -----

app.use(authRouter);

// ----- User Routes -----

app.use("/user", userRouter);

// ----- Image Routes -----

app.use("/gallery", galleryRouter);

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server started on port ${process.env.PORT}`);
});
