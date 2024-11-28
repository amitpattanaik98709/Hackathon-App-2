const express = require("express");
const mongoose = require("mongoose");
const app = express();
const cors = require("cors");
const Hackathon = require("./models/Hackathon_list");
const user = require("./models/User");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();
const fs = require("fs");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(
  process.env.STRIPE_SECRET_KEY
);
const cron = require("node-cron");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

app.use(express.json());
app.use(cors());

mongoose
  .connect(
    process.env.MONGO_URL
  )
  .then(() => {
    console.log("DataBase Connected");
  })
  .catch(() => {
    console.log("Failed to connect with db");
  });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "" + file.originalname);
  },
});

const upload = multer({ storage: storage });

app.post("/image_upload", upload.single("image"), async (req, res) => {
  const x = await cloudinary.uploader.upload(req.file.path);
  fs.unlink(req.file.path, (err) => {
    if (err) console.log(err);
    else {
      console.log("Deleted file");
    }
  });
  return res.status(200).json(x.secure_url);
});

app.post("/addhackathon", async (req, res) => {
  const newdata = new Hackathon({
    name: req.body.name,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    description: req.body.description,
    level: req.body.level,
    image: req.body.responseData,
    state: req.body.state,
    city: req.body.city,
    time: req.body.startTime,
    problemStatements: req.body.problemStatements,
    location: req.body.location,
  });

  await newdata.save();
  console.log("Hackathon Created");
  res.json({
    success: true,
    name: req.body.name,
  });
});

app.get("/gethackathons", async (req, res) => {
  let hackathons = await Hackathon.find();
  console.log("All Products Fetched");
  res.status(200).json(hackathons);
});

app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  let check = await user.findOne({ email });
  if (check) {
    return res.status(400).json({
      success: false,
      errors: "Existing User Found With same Email Address",
    });
  }
  const account = new user({
    name: username,
    email: email,
    password: password,
  });
  await account.save();
  console.log("user created");
  res.status(200).send({
    Success: true,
    data: "User created",
  });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  let check = await user.findOne({ email });
  if (check) {
    if (check.password === password) {
      const id = check.id;
      const logged_in_email = check.email;
      const token = jwt.sign(id, process.env.JWT_SECRET);
      res.status(200).send({
        success: true,
        token,
        logged_in_email,
      });
    } else {
      res.status(404).send({
        success: false,
        data: "Invalid Credentials",
      });
    }
  } else {
    res.status(404).send({
      success: false,
      data: "Invalid Credentials",
    });
  }
});

app.post("/checkprime", async (req, res) => {
  const email = req.body.email;
  if (email) {
    const response = await user.findOne({ email });
    if (response && response.prime_member) {
      res.json({
        status: true,
      });
    } else {
      res.json({
        status: false,
      });
    }
  }
});

app.post("/payment", async (req, res) => {
  const price = req.body.Amount;
  const type = req.body.type;
  const email = req.body.email;

  const lineitems = [
    {
      price_data: {
        currency: "inr",
        product_data: {
          name: "Subscription Cost :",
        },
        unit_amount: Math.round(price * 100),
      },
      quantity: 1,
    },
  ];

  const session = await stripe.checkout.sessions.create({
    line_items: lineitems,
    mode: "payment",
    success_url: "http://localhost:5173/success",
    cancel_url: "http://localhost:5173/cancel",
  });

  if (session) {
    if (email) {
      const newuser = await user.findOne({ email });

      if (newuser) {
        newuser.subscribedate = new Date();

        const currentDate = new Date();
        if (type === "3month") {
          newuser.subscription_expiry_date = new Date(
            currentDate.setMonth(currentDate.getMonth() + 3)
          );
          await newuser.save();
        } else if (type === "12month") {
          newuser.subscription_expiry_date = new Date(
            currentDate.setFullYear(currentDate.getFullYear() + 1)
          );
          await newuser.save();
        } else {
          return res
            .status(400)
            .json({ success: false, message: "Invalid plan selected" });
        }
      }
    }
  } else {
    return res.status.json("Session Expired");
  }
  res.json({ id: session.id });
});

app.put("/setsubscribed", async (req, res) => {
  const email = req.body.email;
  const data = await user.findOne({ email });
  data.prime_member = true;
  await data.save();
});

app.post("/getprime", async (req, res) => {
  const { email } = req.body;
  const response = await user.findOne({ email });
  if (response) {
    if (response.prime_member) {
      res.json({
        success: true,
      });
    } else {
      res.json({
        success: false,
      });
    }
  }
});

app.post("/problems", async (req, res) => {
  const clickedcard = req.body.cardclicked;
  const problems = await Hackathon.find({ name: clickedcard });
  if (problems) {
    res.send(problems[0].problemStatements);
  } else {
    res.json("Not Found");
  }
});

app.post("/participate", async (req, res) => {
  const { hackathon: hackathonName, userdata } = req.body;

  if (!hackathonName) {
    return res
      .status(400)
      .json({ success: false, body: "Hackathon name is required" });
  }

  try {
    const hackathon = await Hackathon.findOne({ name: hackathonName });

    if (!hackathon) {
      return res
        .status(404)
        .json({ success: false, body: "Hackathon not found" });
    }

    hackathon.participants.push(userdata);
    await hackathon.save();

    res
      .status(200)
      .json({ success: true, body: "Participant added successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, body: "Server error", error: error.message });
  }
});

app.post("/hackathon_details", async (req, res) => {
  const response = await Hackathon.find({ name: req.body.hackathon });
  if (response) {
    res.status(200).json({
      success: true,
      body: response,
    });
  } else {
    res.status(404).json({
      success: false,
      body: "Hackathon not found",
    });
  }
});

app.post("/participated_hackathons", async (req, res) => {
  const email = req.body.user;
  const hackathon = req.body.hackathon;

  if (hackathon) {
    const response = await user.findOne({ email: email }); // Use `findOne` instead of `find`
    if (response) {
      response.participated_hackathon.push(hackathon); // Directly access the document
      await response.save(); // Now `response` is a single document, so `save()` will work
      res.status(200).json({
        success: true,
      });
    } else {
      res.json("User not found");
    }
  } else {
    res.json("Hackathon not found");
  }
});

app.post("/getuser", async (req, res) => {
  const email = req.body.email;
  if (email) {
    const response = await user.findOne({ email });
    if (response) {
      res.send(response.participated_hackathon);
    } else {
      res.status(404).json("User Not Found");
    }
  } else {
    res.status(404).json("User Not Found");
  }
});

app.post("/setcreatedhackathon", async (req, res) => {
  const name = req.body.name;
  const email = req.body.email;
  if (email) {
    const response = await user.findOne({ email });
    if (response) {
      response.created_hackathon.push(name);
      await response.save();
    }
  }
});

app.post("/created_hackathon_by_you", async (req, res) => {
  const email = req.body.email;
  if (email) {
    const response = await user.findOne({ email });
    if (response) {
      res.json(response.created_hackathon);
    }
  } else {
    res.status(400).json("Didn't get Email.");
  }
});

cron.schedule("0 0 * * *", async () => {
  try {
    const currentDate = new Date();

    const expiredUsers = await user.find({
      prime_member: true,
      subscription_expiry_date: { $lt: currentDate },
    });

    for (const user of expiredUsers) {
      user.prime_member = false;
      user.subscribedate = null;
      user.subscription_expiry_date = null;
      await user.save();
    }

    console.log(`Updated ${expiredUsers.length} expired subscriptions`);
  } catch (error) {
    console.error("Error updating subscriptions:", error);
  }
});

app.get("/", (req, res) => {
  res.send("API is working");
});

app.listen(3000, () => {
  console.log("server is running on port 3000");
});
