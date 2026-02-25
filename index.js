import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Para validar o usuário logado, usamos o token do Supabase vindo do frontend.
// Aqui basta ANON KEY (não é service role).
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN, // ex: https://volynx.world
    credentials: true,
  })
);
app.use(express.json());

app.post("/create-checkout-session", async (req, res) => {
  try {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ error: "Missing access_token" });

    // Valida o usuário no Supabase
    const { data, error } = await supabase.auth.getUser(access_token);
    if (error || !data?.user) return res.status(401).json({ error: "Invalid session" });

    const user = data.user;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      customer_email: user.email,
      // ESSENCIAL: amarra a assinatura ao user_id
      metadata: { user_id: user.id },
      success_url: `${process.env.FRONTEND_ORIGIN}/dashboard?checkout=success`,
      cancel_url: `${process.env.FRONTEND_ORIGIN}/upgrade?checkout=cancel`,
    });

    return res.json({ url: session.url });
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/health", (_, res) => res.json({ ok: true }));

app.listen(process.env.PORT || 3000);