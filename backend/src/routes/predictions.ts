import { FastifyInstance } from "fastify";
import { getTopBets } from "../services/ai.service";
import { getCache, setCache } from "../services/cache.service";
import { authenticate, requirePremium } from "../middleware/auth";

export default async function (app: FastifyInstance) {
  
  app.get("/ai/top-bets", async (req, reply) => {
    const cacheKey = "top_bets_free";
    let data = await getCache(cacheKey);

    if (!data) {
      data = await getTopBets(5); // Free users get top 5
      await setCache(cacheKey, data, 600); // 10 min cache
    }
    return data;
  });

  app.get("/ai/premium-bets", {
    preHandler: [authenticate, requirePremium]
  }, async (req, reply) => {
    const cacheKey = "top_bets_premium";
    let data = await getCache(cacheKey);

    if (!data) {
      data = await getTopBets(20); // Premium users get top 20
      await setCache(cacheKey, data, 300); // 5 min cache
    }
    return data;
  });

}
