require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const checkAuth = require("./middlewares/checkAuth");
const authRouter = require("./routes/authRoutes");
const userRouter = require("./routes/userRoutes");
const galleryRouter = require("./routes/galleryRoutes");
const connectMongo = require("./config/mongo");

connectMongo();

const app = express();

// Middlewares

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(checkAuth);


// ----- Routes -----

app.get("/", (req, res) => {
  res.json({ message: "Welcome!", user: req.user });
});

app.use("/auth", authRouter);

app.use("/user", userRouter);

app.use("/gallery", galleryRouter);

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server started on port ${process.env.PORT}`);
});
