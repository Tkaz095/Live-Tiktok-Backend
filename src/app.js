import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';
import { setupSwagger } from './config/swagger.js';

const app = express();

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger setup
setupSwagger(app);

// Routes
app.use('/api', apiRoutes);

export default app;
