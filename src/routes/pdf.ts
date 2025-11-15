import express from 'express';

// Controllers
import { pdfController } from '../controllers';

// Middleware
import { validateSchema } from '../middleware/validateSchema';
import upload from '../utils/upload';

// Schemas
import { pdfSchema } from '../schemas/pdf.schema';

const router = express.Router();

router.post(
    '/',
    upload.array('images'),
    validateSchema(pdfSchema),
    (req, res, next) => pdfController.createFromImages(req as any, res, next)
);

export default router;
