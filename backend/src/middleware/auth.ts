import jwt from "jsonwebtoken";
import { FastifyRequest, FastifyReply } from "fastify";

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) throw new Error("No token");
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "super-secret");
    (req as any).user = decoded;
  } catch (err) {
    reply.code(401).send({ error: "Unauthorized" });
  }
}

export async function requirePremium(req: FastifyRequest, reply: FastifyReply) {
  if (!(req as any).user?.isPremium) {
    return reply.code(403).send({ error: "Premium subscription required" });
  }
}
