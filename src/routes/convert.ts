import express from 'express';

// Controllers
import { imageController } from '../controllers';

// Middleware
import { validateSchema } from '../middleware/validateSchema';
import upload from '../utils/upload';

// Schemas
import { convertSchema } from '../schemas';

const router = express.Router();

router.post(
    '/',
    upload.array('images'),
    validateSchema(convertSchema),
    (req, res, next) => imageController.convert(req as any, res, next)
);

export default router;
