import { Router } from 'express'
import { proxyRequest } from '../controllers/proxyController.js'
import { authenticateToken } from '../middleware/auth.js'

export const proxyRouter = Router()

// 인증된 사용자만 프록시 사용 가능
proxyRouter.post('/', authenticateToken, proxyRequest)
