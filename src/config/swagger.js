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
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Nhập JWT token nhận được sau khi login'
                }
            }
        },
    },
    apis: [
        './src/routes/v1/auth.routes.js',
        './src/routes/v1/services.routes.js',
        './src/routes/v1/subscriptions.routes.js',
        './src/routes/v1/tiktokers.routes.js',
        './src/routes/v1/streams.routes.js',
        './src/routes/api.js'
    ],
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);

export const setupSwagger = (app) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
};
