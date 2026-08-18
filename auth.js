import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

// Combined auth endpoint. Which action runs is picked with ?action=
//   /api/auth?action=login
//   /api/auth?action=register
//   /api/auth?action=admin-login

export default async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      return response.status(405).json({
        error: "Method not allowed"
      });
    }

    const action = request.query.action;

    // =========================
    // LOGIN
    // =========================

    if (action === "login") {
      const { email, password } = request.body || {};

      if (!email || !password) {
        return response.status(400).json({
          error: "Email and password are required"
        });
      }

      const cleanEmail = String(email).trim().toLowerCase();

      const sql = neon(process.env.DATABASE_URL);

      const users = await sql`
        SELECT id, username, email, password_hash
        FROM users
        WHERE email = ${cleanEmail}
        LIMIT 1
      `;

      if (users.length === 0) {
        return response.status(401).json({
          error: "Invalid email or password"
        });
      }

      const user = users[0];

      const passwordMatches = await bcrypt.compare(
        password,
        user.password_hash
      );

      if (!passwordMatches) {
        return response.status(401).json({
          error: "Invalid email or password"
        });
      }

      response.setHeader(
        "Set-Cookie",
        `user_id=${encodeURIComponent(user.id)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=7776000`
      );

      return response.status(200).json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    }

    // =========================
    // REGISTER
    // =========================

    if (action === "register") {
      const { username, email, password } = request.body || {};

      if (!username || !email || !password) {
        return response.status(400).json({
          error: "Username, email and password are required"
        });
      }

      const cleanUsername = String(username).trim();
      const cleanEmail = String(email).trim().toLowerCase();

      if (cleanUsername.length < 3) {
        return response.status(400).json({
          error: "Username must be at least 3 characters"
        });
      }

      if (password.length < 8) {
        return response.status(400).json({
          error: "Password must be at least 8 characters"
        });
      }

      const sql = neon(process.env.DATABASE_URL);

      const existingUser = await sql`
        SELECT id
        FROM users
        WHERE username = ${cleanUsername}
           OR email = ${cleanEmail}
        LIMIT 1
      `;

      if (existingUser.length > 0) {
        return response.status(409).json({
          error: "Username or email already exists"
        });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const result = await sql`
        INSERT INTO users (
          username,
          email,
          password_hash
        )
        VALUES (
          ${cleanUsername},
          ${cleanEmail},
          ${passwordHash}
        )
        RETURNING id, username, email, created_at
      `;

      return response.status(201).json({
        success: true,
        user: result[0]
      });
    }

    // =========================
    // ADMIN LOGIN
    // =========================

    if (action === "admin-login") {
      const { password } = request.body || {};

      if (!password || password !== process.env.ADMIN_SECRET) {
        return response.status(401).json({
          error: "Invalid password"
        });
      }

      response.setHeader(
        "Set-Cookie",
        "admin_authenticated=true; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400"
      );

      return response.status(200).json({
        success: true
      });
    }

    return response.status(400).json({
      error: "Unknown or missing action"
    });

  } catch (error) {
    console.error(error);

    return response.status(500).json({
      error: "Something went wrong"
    });
  }
}
