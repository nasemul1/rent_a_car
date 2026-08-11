import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { loginSchema } from '../validators/auth.validator';

const router = Router();

router.post('/login', validate(loginSchema), (req, res) => authController.login(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.post('/refresh', (req, res) => authController.refresh(req, res));

export default router;
