// axiosClient.js - Updated version
import axios from 'axios';

const client = axios.create({
    baseURL: 'https://api.biharilibrary.in',
    timeout: 30000, // Increased timeout for file uploads
});

// Add request interceptor to handle FormData properly for React Native
client.interceptors.request.use(
    (config) => {
        // console.log('Request interceptor:', {
        //     url: config.url,
        //     method: config.method,
        //     hasFormData: !!(config.data && config.data._parts),
        //     contentType: config.headers['Content-Type']
        // });

        // Critical fix for React Native FormData
        if (config.data && config.data._parts) {
            // This is React Native FormData - remove Content-Type to let RN handle it
            delete config.headers['Content-Type'];
            // console.log('Removed Content-Type header for FormData');
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor for better error handling
client.interceptors.response.use(
    (response) => {
        // console.log('Response received:', response.status);
        return response;
    },
    (error) => {
        // console.error('Response error:', {
        //     status: error.response?.status,
        //     data: error.response?.data,
        //     message: error.message,
        //     code: error.code
        // });
        return Promise.reject(error);
    }
);

export default client;