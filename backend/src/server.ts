import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import predictionsRoutes from "./routes/predictions";
import subscriptionsRoutes from "./routes/subscriptions";

const app = Fastify({
  logger: true
});

app.register(helmet);
app.register(cors);
app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute"
});

// Routes
app.register(predictionsRoutes);
app.register(subscriptionsRoutes);

// Health check
app.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || "3000");
    await app.listen({ port, host: "0.0.0.0" });
    console.log(`🚀 Production API server running on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
