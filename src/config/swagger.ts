import swaggerJsdoc from 'swagger-jsdoc';

const packageJson = require('../../package.json');

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'ImgTools Backend API',
            version: packageJson.version,
            description: 'API para processamento de imagens - conversão, redimensionamento, ajuste de DPI e criação de PDFs',
            contact: {
                name: 'API Support',
            },
        },
        servers: [
            {
                url: process.env.API_URL || 'http://localhost:4000',
                description: 'Development server',
            },
            {
                url: process.env.PRODUCTION_URL || 'https://api.example.com',
                description: 'Production server',
            },
        ],
        components: {
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            description: 'Error message',
                        },
                    },
                },
            },
        },
    },
    apis: ['./src/routes/*.ts'], // Path to the API routes
};

export const swaggerSpec = swaggerJsdoc(options);
