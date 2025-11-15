import express from 'express';

// Controllers
import { imageController } from '../controllers';

// Middleware
import { validateSchema } from '../middleware/validateSchema';
import upload from '../utils/upload';

// Schemas
import { resizeSchema } from '../schemas';

const router = express.Router();

router.post(
    '/',
    upload.array('images'),
    validateSchema(resizeSchema),
    (req, res, next) => imageController.resize(req as any, res, next)
);

export default router;
