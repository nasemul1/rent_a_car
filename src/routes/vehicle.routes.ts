import { Router } from 'express';
import multer from 'multer';
import { vehicleController } from '../controllers/vehicle.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { createVehicleSchema, updateVehicleSchema } from '../validators/vehicle.validator';
import { config } from '../config/env';

const upload = multer({
  dest: config.uploadPath,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP allowed'));
    }
  },
});

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => vehicleController.getAll(req, res));
router.get('/:id', (req, res) => vehicleController.getById(req, res));
router.post('/', upload.single('photo'), validate(createVehicleSchema), (req, res) =>
  vehicleController.create(req, res),
);
router.put('/:id', upload.single('photo'), validate(updateVehicleSchema), (req, res) =>
  vehicleController.update(req, res),
);
router.delete('/:id', (req, res) => vehicleController.delete(req, res));

export default router;
