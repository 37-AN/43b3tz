import { FastifyInstance } from "fastify";
import { pool } from "../db";
import { authenticate } from "../middleware/auth";

export default async function (app: FastifyInstance) {
  
  app.get("/user/subscription", {
    preHandler: [authenticate]
  }, async (req: any) => {
    const userId = req.user.id;
    const res = await pool.query(
      "SELECT plan, status, expires_at FROM subscriptions WHERE user_id = $1",
      [userId]
    );
    return res.rows[0] || { plan: "free", status: "none" };
  });

}
