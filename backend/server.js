
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { init, get, run } from "./db.js";

dotenv.config();
await init();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const PORT = process.env.PORT || 8787;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

function signToken(user){
  return jwt.sign({ uid: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });
}

function auth(req, res, next){
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if(!token) return res.status(401).json({ error: "Missing token" });
  try{
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  }catch{
    return res.status(401).json({ error: "Invalid token" });
  }
}

function sanitizeUser(u){
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    isPro: !!u.isPro,
    proExpiresAt: u.proExpiresAt
  };
}

app.get("/api/health", (req,res)=> res.json({ ok:true, service:"pisgah-backend" }));

app.post("/api/auth/register", async (req,res)=>{
  try{
    const { fullName, email, password } = req.body || {};
    if(!fullName || !email || !password || password.length < 6){
      return res.status(400).json({ error: "Invalid input" });
    }
    const existing = await get("SELECT * FROM users WHERE email = ?", [email.toLowerCase()]);
    if(existing) return res.status(409).json({ error: "Email already exists" });

    const hash = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();
    const r = await run(
      "INSERT INTO users (fullName,email,passwordHash,createdAt) VALUES (?,?,?,?)",
      [fullName.trim(), email.toLowerCase(), hash, createdAt]
    );
    const user = await get("SELECT * FROM users WHERE id = ?", [r.lastID]);
    const token = signToken(user);
    return res.json({ token, user: sanitizeUser(user) });
  }catch(e){
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/login", async (req,res)=>{
  try{
    const { email, password } = req.body || {};
    if(!email || !password) return res.status(400).json({ error: "Invalid input" });

    const user = await get("SELECT * FROM users WHERE email = ?", [email.toLowerCase()]);
    if(!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if(!ok) return res.status(401).json({ error: "Invalid credentials" });

    // auto-expire Pro if past date
    if(user.isPro && user.proExpiresAt){
      const exp = new Date(user.proExpiresAt).getTime();
      if(Number.isFinite(exp) && exp < Date.now()){
        await run("UPDATE users SET isPro = 0, proExpiresAt = NULL WHERE id = ?", [user.id]);
        user.isPro = 0; user.proExpiresAt = null;
      }
    }

    const token = signToken(user);
    return res.json({ token, user: sanitizeUser(user) });
  }catch{
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/me", auth, async (req,res)=>{
  const user = await get("SELECT * FROM users WHERE id = ?", [req.user.uid]);
  if(!user) return res.status(404).json({ error: "User not found" });

  // expire pro if needed
  if(user.isPro && user.proExpiresAt){
    const exp = new Date(user.proExpiresAt).getTime();
    if(Number.isFinite(exp) && exp < Date.now()){
      await run("UPDATE users SET isPro = 0, proExpiresAt = NULL WHERE id = ?", [user.id]);
      user.isPro = 0; user.proExpiresAt = null;
    }
  }

  return res.json({ user: sanitizeUser(user) });
});

/**
 * Paystack verification:
 * Frontend uses Paystack inline and gets a reference.
 * Backend verifies reference using secret key and activates Pro for 4 months (one semester-ish).
 */
app.get("/api/paystack/verify", auth, async (req,res)=>{
  try{
    const reference = String(req.query.reference || "").trim();
    if(!reference) return res.status(400).json({ error: "Missing reference" });

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if(!secret) return res.status(500).json({ error: "PAYSTACK_SECRET_KEY not set" });

    const verifyUrl = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`;
    const resp = await axios.get(verifyUrl, { headers: { Authorization: `Bearer ${secret}` } });

    const data = resp.data?.data;
    if(!data) return res.status(400).json({ error: "Verification failed" });

    if(data.status !== "success"){
      return res.status(402).json({ error: "Payment not successful" });
    }

    // optional: enforce amount
    const expectedKobo = Number(process.env.PRO_PRICE_KOBO || 2500 * 100);
    const paidKobo = Number(data.amount || 0);
    if(expectedKobo && paidKobo < expectedKobo){
      return res.status(402).json({ error: "Amount mismatch" });
    }

    // Activate Pro: 4 months from now (semester-ish). Adjust if you want.
    const now = new Date();
    const exp = new Date(now);
    exp.setMonth(exp.getMonth() + 4);

    await run("UPDATE users SET isPro = 1, proExpiresAt = ? WHERE id = ?", [exp.toISOString(), req.user.uid]);
    const user = await get("SELECT * FROM users WHERE id = ?", [req.user.uid]);

    return res.json({ ok:true, user: sanitizeUser(user) });
  }catch(e){
    return res.status(500).json({ error: "Verification error" });
  }
});

app.listen(PORT, ()=> {
  console.log(`Pisgah backend running on :${PORT}`);
});
