import { Response } from "express";
import { deleteFile } from "./fileHandler";

export function sendFileAndCleanup(res: Response, filePath: string, filename: string) {
    res.download(filePath, filename, (err) => {
        if (err) {
            console.error("Erro ao enviar imagem:", err);
            res.status(500).json({ error: "Erro ao enviar imagem." }).end();
        }

        console.log(filePath);

        setTimeout(() => {
            deleteFile(filePath);
        }, 1000);
    });
}
