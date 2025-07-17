import { Router } from 'express';
import { register, login, profile } from '../controllers/authController';
import { authMiddleware } from '../utils/jwt';

const router: Router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', authMiddleware, profile);

export default router;