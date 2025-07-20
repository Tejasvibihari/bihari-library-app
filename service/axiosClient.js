import axios from 'axios';

const client = axios.create({
    baseURL: 'https://api.biharilibrary.in',
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default client;
