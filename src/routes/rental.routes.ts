import { Router } from 'express';
import { rentalController } from '../controllers/rental.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { createRentalSchema } from '../validators/rental.validator';

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => rentalController.getAll(req, res));
router.get('/:id', (req, res) => rentalController.getById(req, res));
router.post('/', validate(createRentalSchema), (req, res) => rentalController.create(req, res));
router.put('/:id', validate(createRentalSchema), (req, res) => rentalController.update(req, res));
router.delete('/:id', (req, res) => rentalController.delete(req, res));

export default router;
