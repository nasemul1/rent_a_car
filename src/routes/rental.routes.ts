import { Router, NextFunction, Request, Response } from 'express';
import { rentalController } from '../controllers/rental.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { createRentalSchema } from '../validators/rental.validator';

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler((req, res) => rentalController.getAll(req, res)));
router.get('/:id', asyncHandler((req, res) => rentalController.getById(req, res)));
router.post('/', validate(createRentalSchema), asyncHandler((req, res) => rentalController.create(req, res)));
router.put('/:id', validate(createRentalSchema), asyncHandler((req, res) => rentalController.update(req, res)));
router.delete('/:id', asyncHandler((req, res) => rentalController.delete(req, res)));

export default router;
