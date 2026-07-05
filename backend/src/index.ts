import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { config } from './routes/config.js';
import { diagrams } from './routes/diagrams.js';

const app = new Hono();

// Allow the Vite dev server and the nginx-served frontend to call the API.
app.use('/api/*', cors());

app.route('/api/config', config);
app.route('/api/diagrams', diagrams);

const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port }, (info) => {
    console.log(`ChartDB backend running on http://localhost:${info.port}`);
});
