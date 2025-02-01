const express = require('express');
const status = require('./status');
const {WORKING_PORT} = require('./settings.json')
const app = express();
app.disable('x-powered-by');
app.get('/status', (req, res) => res.json(status()));
app.all('*', (req, res) => {
    res.json({
        message: 'Hello World!'
    });
});


app.listen(WORKING_PORT, () => {
    console.log(`Server is running on 127.0.0.1:${WORKING_PORT}`);
});