const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Function to send a test notification
async function sendTestNotification(token, title, body, data = {}) {
  try {
    const message = {
      notification: {
        title: title,
        body: body
      },
      data: data,
      token: token
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

// Example usage
const testToken = 'YOUR_DEVICE_FCM_TOKEN';
const notificationTitle = 'Test Notification';
const notificationBody = 'This is a test notification from the server';

// Send test notification
sendTestNotification(testToken, notificationTitle, notificationBody, {
  type: 'test',
  timestamp: new Date().toISOString()
});
