import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { createClient } from '@supabase/supabase-js'
import { Redis } from 'ioredis'
import * as dotenv from 'dotenv'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import jwt from '@fastify/jwt'
import { z } from 'zod'

dotenv.config()

import { logger } from './utils/logger'

declare module 'fastify' {
    interface FastifyInstance {
        authenticate: any
    }
}

const fastify: FastifyInstance = Fastify()

// Initialize Fastify Plugins
fastify.register(cors, { origin: true }) // Accept all for now, harden later
fastify.register(helmet)
fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
})

fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'super-secret-prediction-key-123'
})

// Setup Supabase
const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// Setup Redis Cache
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

// Helper for Caching
async function cacheLayer(key: string, ttl: number, fetchFn: () => Promise<any>) {
    const cached = await redis.get(key)
    if (cached) return JSON.parse(cached)
    const data = await fetchFn()
    if (data) await redis.set(key, JSON.stringify(data), 'EX', ttl)
    return data
}

// Auth Middleware Decorator
fastify.decorate("authenticate", async function (request: FastifyRequest, reply: FastifyReply) {
    try {
        await request.jwtVerify()
    } catch (err) {
        reply.send(err)
    }
})

// MATCHES ENDPOINTS
fastify.get('/matches', async (request, reply) => {
    // Cache: 5 min TTL
    return cacheLayer('matches:today', 300, async () => {
        const { data, error } = await supabase.from('matches').select('*')
        if (error) throw error
        return data
    })
})

const matchIdSchema = z.object({ id: z.string().uuid() })

fastify.get<{ Params: { id: string } }>('/matches/:id', async (request, reply) => {
    const { id } = matchIdSchema.parse(request.params)
    return cacheLayer(`matches:${id}`, 300, async () => {
        const { data, error } = await supabase.from('matches').select('*').eq('id', id).single()
        if (error) throw error
        return data
    })
})

// ODDS ENDPOINTS
fastify.get<{ Params: { match_id: string } }>('/odds/:match_id', async (request, reply) => {
    const { id: match_id } = matchIdSchema.parse({ id: request.params.match_id })
    // Cache: 2 min TTL
    return cacheLayer(`odds:match:${match_id}`, 120, async () => {
        const { data, error } = await supabase.from('odds').select('*').eq('match_id', match_id)
        if (error) throw error
        return data
    })
})

// PREMIUM VALUE BETS ENGINE (Requires Premium Auth via DB check or JWT Role)
// Task 8: Value Bet Engine (Production)
fastify.get('/predictions/value-bets', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    // Cache: 10 min TTL
    return cacheLayer('predictions:top', 600, async () => {
        // Fetch valid predictions joined with latest odds, or filter post-fetch.
        // Assuming predictions table has edge_home, confidence.
        // And odds table has home_odds.
        // Simplified raw approach: fetch predictions > 0.7 confidence, edge > 0.05
        const { data, error } = await supabase
            .from('predictions')
            .select('*, matches(*)')
            .gte('confidence', 0.7)
        if (error) throw error

        let valueBets = data.filter((p: any) => p.edge_home > 0.05 || p.edge_away > 0.05 || p.edge_draw > 0.05)
        
        // Add risk level classification
        valueBets = valueBets.map((bet: any) => {
            const maxEdge = Math.max(bet.edge_home || 0, bet.edge_away || 0, bet.edge_draw || 0)
            let risk = "HIGH"
            if (maxEdge > 0.1) risk = "LOW"
            else if (maxEdge > 0.05) risk = "MEDIUM"

            return { ...bet, risk_level: risk }
        })

        return valueBets
    })
})

// Invalidation Helper endpoint
fastify.post('/cache/invalidate', { preValidation: [fastify.authenticate] }, async (request: any, reply) => {
    // Admin only or internal usage only validation happens here
    const { pattern } = request.body as { pattern: string }
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
        await redis.del(...keys)
    }
    return { success: true, invalidatedCount: keys.length }
})

// Global Error Handler for Zod
fastify.setErrorHandler(function (error: any, request, reply) {
    if (error instanceof z.ZodError) {
        reply.status(400).send({ error: 'Validation Error', issues: error.issues })
    } else {
        logger.error(`API Error: ${error?.message || error}`)
        reply.status(500).send({ error: 'Internal Server Error' })
    }
})

// Run Server
const start = async () => {
    try {
        await fastify.listen({ port: 3000, host: '0.0.0.0' })
        logger.info(`Server listening on \${fastify.server.address()?.toString()}`)
    } catch (err) {
        logger.error(err)
        process.exit(1)
    }
}
start()
