import multer from "multer";
import fs from "fs";
import { UPLOADS_DIR } from "./coreFolders";

if (!fs.existsSync(UPLOADS_DIR)) {
    throw new Error(`Upload directory does not exist: ${UPLOADS_DIR}`);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

export default upload;