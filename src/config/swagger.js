import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'TikTok Live Monitor API',
            version: '1.0.0',
            description: 'Tài liệu API cho TikTok Live Backend.',
        },
        servers: [
            {
                url: 'http://localhost:4000',
            },
        ],
    },
    apis: ['./src/routes/*.js', './src/routes/**/*.js'], 
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);

export const setupSwagger = (app) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
};
