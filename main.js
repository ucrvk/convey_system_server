import express from 'express';
import status from './status.js';
const app = express();
app.disable('x-powered-by');
app.get('/status', (req, res) => res.json(status()));
app.all('*', (req, res) => {
    res.json({
        message: 'Hello World!'
    });
});


app.listen(3000, () => {
    console.log('Server is running on 127.0.0.1:3000');
});