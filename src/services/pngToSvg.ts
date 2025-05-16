import fs from "fs";

export async function convertPngToSvg(filePath: string): Promise<string> {
    // Simulação: retorna SVG fixo (coloca aqui integração real depois)
    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <rect width="100" height="100" fill="gray" />
      <text x="10" y="50" fill="white">Placehol</text>
    </svg>
  `;
}
