// ---------------------------
// IMPORTS
// ---------------------------
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const admin = require("firebase-admin");

// ---------------------------
// APP INIT
// ---------------------------
const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------
// FIREBASE INIT
// ---------------------------
admin.initializeApp({
  credential: admin.credential.cert(require("./serviceAccountKey.json"))
});

const db = admin.firestore();

// ---------------------------
// FAST2SMS API KEY
// ---------------------------
const FAST2SMS_API = "YOUR_FAST2SMS_API_KEY";   // ⭐ खुद की API KEY डालें

// ---------------------------
// SEND SMS FUNCTION
// ---------------------------
async function sendSMS(mobile, message) {
  try {
    const res = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        route: "v3",
        sender_id: "TXTIND",
        message: message,
        language: "english",
        numbers: mobile,
      },
      {
        headers: {
          authorization: FAST2SMS_API,
        }
      }
    );

    console.log("SMS Sent:", res.data);
    return true;
  } catch (e) {
    console.error("SMS Error:", e);
    return false;
  }
}

// ---------------------------
// 1. GET ALL USER REQUESTS
// ---------------------------
app.get("/get-requests", async (req, res) => {
  const users = await db.collection("users_requests").get();
  const forgot = await db.collection("forgot_password").get();
  const unlock = await db.collection("unlock_requests").get();

  res.json({
    users: users.docs.map(d => d.data()),
    forgot: forgot.docs.map(d => d.data()),
    unlock: unlock.docs.map(d => d.data()),
  });
});

// ---------------------------
// 2. APPROVE REQUEST (Send SMS)
// ---------------------------
app.post("/approve", async (req, res) => {
  const { type, mobile } = req.body;

  const password = Math.floor(100000 + Math.random() * 900000).toString();

  const msg = `Your request is approved.\nMobile: ${mobile}\nPassword: ${password}`;

  const smsSent = await sendSMS(mobile, msg);

  if (!smsSent) {
    return res.json({ success: false, message: "SMS Failed" });
  }

  await db
    .collection("approved")
    .doc(mobile)
    .set({
      mobile,
      password,
      type,
      approvedAt: new Date(),
    });

  res.json({ success: true, message: "Approved & SMS sent" });
});

// ---------------------------
// START SERVER
// ---------------------------
app.listen(5000, () => {
  console.log("SERVER RUNNING ON http://localhost:5000");
});
