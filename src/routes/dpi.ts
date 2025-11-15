import express from 'express';

// Controllers
import { imageController } from '../controllers';

// Middleware
import { validateSchema } from '../middleware/validateSchema';
import upload from '../utils/upload';

// Schemas
import { dpiSchema } from '../schemas';

const router = express.Router();

router.post(
    '/',
    upload.array('images'),
    validateSchema(dpiSchema),
    (req, res, next) => imageController.adjustDpi(req as any, res, next)
);

export default router;
