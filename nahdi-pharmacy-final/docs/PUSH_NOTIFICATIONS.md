# Push Notifications System

This document provides an overview of the push notification system implemented in the application.

## Overview

The push notification system uses Firebase Cloud Messaging (FCM) to deliver real-time notifications to users. The system consists of both frontend and backend components that work together to manage notification subscriptions, delivery, and display.

## Architecture

### Frontend Components

1. **Firebase Service** (`src/services/firebaseService.js`)
   - Initializes Firebase and handles FCM token generation
   - Manages the service worker registration
   - Handles incoming push messages

2. **Push Notifications Hook** (`src/hooks/usePushNotifications.js`)
   - Manages push notification subscription state
   - Handles permission requests
   - Provides methods to subscribe/unsubscribe from push notifications

3. **Notification Settings** (`src/components/NotificationSettings.jsx`)
   - UI for managing notification preferences
   - Allows users to enable/disable push notifications

4. **Test Push Notification** (`src/components/TestPushNotification.jsx`)
   - Component for testing push notifications
   - Sends test notifications to the current device

5. **Test Push Page** (`src/pages/TestPushPage.jsx`)
   - Dedicated page for testing push notification functionality
   - Displays subscription status and allows sending test notifications

### Backend Components

1. **FCM Token Model** (`pharmacy-backend/models/fcm_token.go`)
   - Defines the database schema for storing FCM tokens
   - Handles CRUD operations for tokens

2. **FCM Handler** (`pharmacy-backend/handlers/fcm.go`)
   - Handles token registration
   - Sends push notifications to devices
   - Manages token cleanup and updates

3. **Migrations** (`pharmacy-backend/migrations/`)
   - Database migrations for the FCM tokens table

## Setup Instructions

### Prerequisites

1. Firebase Project
   - Create a new project in the [Firebase Console](https://console.firebase.google.com/)
   - Add a web app to your Firebase project
   - Copy the Firebase configuration (apiKey, authDomain, etc.)

2. Environment Variables
   - Add the following to your `.env` file:
     ```
     REACT_APP_FIREBASE_API_KEY=your_api_key
     REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
     REACT_APP_FIREBASE_PROJECT_ID=your_project_id
     REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
     REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
     REACT_APP_FIREBASE_APP_ID=your_app_id
     REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
     ```

   - For the backend, add:
     ```
     FCM_SERVER_KEY=your_fcm_server_key
     ```

### Service Worker

The service worker (`firebase-messaging-sw.js`) is responsible for receiving push notifications while the app is in the background. It must be placed in the `public` directory.

## Testing

### Test Notification API

Send a test push notification to the current user's device.

**Endpoint**: `POST /api/fcm/test`

**Headers**:
- `Authorization: Bearer <JWT_TOKEN>`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "title": "Test Notification",
  "body": "This is a test notification",
  "data": {
    "key1": "value1",
    "key2": "value2"
  }
}
```

**Response**:
```json
{
  "message": "Test notification sent successfully",
  "notificationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Testing Methods

1. **Using the Test Page**
   - Visit the test page at `/test-push`
   - Use the form to send test notifications
   - Verify notifications appear in both foreground and background states

2. **Manual Testing**
   - Use an API client (Postman, curl, etc.) to send requests to the test endpoint
   - Ensure your browser allows notifications for the site
   - Check the browser console for any errors

3. **Automated Testing**
   - Write integration tests that verify the notification flow
   - Test both successful and error scenarios

## Common Issues

1. **Permissions Denied**
   - Ensure the domain is allowed in the Firebase Console
   - Check that the browser has notification permissions enabled

2. **Token Generation Fails**
   - Verify Firebase configuration
   - Check for console errors during initialization

3. **Notifications Not Received**
   - Ensure the service worker is properly registered
   - Check that the FCM token is valid and not expired

## Security Considerations

### 1. Transport Security
- **Always use HTTPS** in production to ensure all communications are encrypted
- Implement **HSTS (HTTP Strict Transport Security)** to prevent protocol downgrade attacks
- Use **secure cookies** with `Secure` and `HttpOnly` flags for session management

### 2. Authentication & Authorization
- **Protect all notification endpoints** with proper authentication
- Implement **rate limiting** on notification endpoints to prevent abuse
- Use **short-lived access tokens** with refresh tokens for API authentication
- Implement **role-based access control** for sensitive operations

### 3. Data Protection
- **Encrypt sensitive data** in notifications (e.g., personal information)
- **Minimize data exposure** - only include necessary information in notifications
- **Sanitize all user input** to prevent XSS and injection attacks
- **Implement input validation** on both client and server sides

### 4. Firebase Security
- **Restrict API keys** in Firebase Console to specific domains/APIs
- **Use Firebase App Check** to protect against unauthorized access
- **Rotate FCM server keys** periodically and in case of exposure
- **Monitor usage** in Firebase Console for suspicious activity

### 5. Privacy Compliance
- **Obtain explicit user consent** before enabling notifications
- Provide clear **privacy policy** about notification data collection and usage
- Implement mechanisms for users to **opt-out** of notifications
- **Log notification events** for auditing purposes
- **Comply with regulations** like GDPR, CCPA for user data handling

### 6. Service Worker Security
- **Validate message origins** in the service worker
- Implement **message encryption** for sensitive notifications
- Set appropriate **Content Security Policy (CSP)** headers
- **Cache only necessary resources** in the service worker

### 7. Secure Development Practices
- **Keep dependencies updated** to patch known vulnerabilities
- **Regular security audits** of the notification system
- **Penetration testing** of notification endpoints
- **Secure error handling** to prevent information leakage

## API Reference

### Frontend API

#### `usePushNotifications` Hook

```javascript
const {
  isSupported,           // Boolean indicating if push notifications are supported
  isPermissionGranted,   // Boolean indicating if permission is granted
  isSubscribed,          // Boolean indicating if user is subscribed
  fcmToken,              // Current FCM token
  subscribeUser,         // Function to subscribe the user
  unsubscribeUser,       // Function to unsubscribe the user
  error                  // Any error that occurred
} = usePushNotifications();
```

### Backend API

#### `POST /api/fcm/subscribe`
Register a new FCM token for the authenticated user.

**Request Body:**
```json
{
  "token": "fcm_token_string",
  "deviceId": "unique_device_identifier"
}
```

#### `POST /api/fcm/test`
Send a test notification to the current user's device.

**Request Body:**
```json
{
  "title": "Test Notification",
  "body": "This is a test notification",
  "data": {
    "type": "test",
    "timestamp": "2023-01-01T00:00:00Z"
  }
}
```

## Troubleshooting

1. **Check Browser Console**
   - Look for any error messages related to Firebase or service worker

2. **Verify Service Worker**
   - Open Chrome DevTools > Application > Service Workers
   - Ensure the Firebase service worker is registered and running

3. **Check Network Requests**
   - Verify that token registration requests are successful
   - Check for any failed API calls

## Future Enhancements

1. Support for different notification channels
2. Rich media notifications
3. Notification grouping
4. Scheduled notifications
5. User preferences for different notification types
