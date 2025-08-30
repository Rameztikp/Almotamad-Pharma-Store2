import React, { useState, useEffect } from 'react';
import { Button, Card, Space, Typography, message, Switch, Divider, Alert, Form, Input } from 'antd';
import { BellOutlined, CheckCircleOutlined, CloseCircleOutlined, SendOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { 
  initializePushNotifications, 
  subscribeToPushNotifications, 
  sendTestNotification,
  getFCMToken
} from '../services/firebaseService';

const { Title, Text } = Typography;

const PushNotificationTester = () => {
  const { t } = useTranslation();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [fcmToken, setFcmToken] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    // Initialize messaging when component mounts
    const initialize = async () => {
      try {
        await initializePushNotifications();
        
        // Check if notifications are enabled
        if (Notification.permission === 'granted') {
          setNotificationsEnabled(true);
          const token = await getFCMToken();
          if (token) {
            setFcmToken(token);
            setPushEnabled(true);
          }
        }
      } catch (error) {
        console.error('Error initializing push notifications:', error);
        message.error(t('notifications.initializationError'));
      }
    };

    initialize();
  }, [t]);

  // Handle enabling/disabling push notifications
  const togglePushNotifications = async (checked) => {
    try {
      if (checked) {
        // Initialize push notifications
        await initializePushNotifications();
        
        // Subscribe to push notifications
        await subscribeToPushNotifications();
        
        // Get the FCM token
        const token = await getFCMToken();
        setFcmToken(token);
        
        setPushEnabled(true);
        message.success(t('notifications.pushEnabled'));
      } else {
        // In a real app, you would want to unsubscribe from push notifications
        // For now, we'll just update the local state
        setPushEnabled(false);
        message.info(t('notifications.pushDisabled'));
      }
    } catch (error) {
      console.error('Error toggling push notifications:', error);
      message.error(t('notifications.pushError'));
    }
  };
  
  // Handle sending a test notification
  const sendTestNotification = async (values) => {
    try {
      setSendingTest(true);
      const { title, body } = values;
      
      await sendTestNotification(
        title || t('notifications.testTitle'),
        body || t('notifications.testBody')
      );
      
      message.success(t('notifications.testSent'));
    } catch (error) {
      console.error('Error sending test notification:', error);
      message.error(t('notifications.testError'));
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <Card 
      title={
        <Space>
          <BellOutlined />
          {t('notifications.pushNotifications')}
        </Space>
      }
      style={{ marginBottom: 24 }}
    >
      <div style={{ marginBottom: 16 }}>
        <Text>{t('notifications.pushNotificationsDesc')}</Text>
      </div>
      
      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong>{t('notifications.enablePushNotifications')}</Text>
          <Switch 
            checked={pushEnabled} 
            onChange={togglePushNotifications}
            loading={isLoading}
            checkedChildren={<CheckCircleOutlined />}
            unCheckedChildren={<CloseCircleOutlined />}
          />
        </div>
        
        {pushEnabled && (
          <Alert
            message={t('notifications.pushEnabledDesc')}
            type="success"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
        
        <Divider />
        
        <div>
          <Title level={5}>{t('notifications.testNotifications')}</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            {t('notifications.testNotificationsDesc')}
          </Text>
          
          <Form
            layout="vertical"
            onFinish={sendTestNotification}
            initialValues={{
              title: t('notifications.testTitle'),
              body: t('notifications.testBody')
            }}
          >
            <Form.Item
              label={t('notifications.notificationTitle')}
              name="title"
              rules={[{ required: true, message: t('notifications.titleRequired') }]}
            >
              <Input placeholder={t('notifications.enterTitle')} />
            </Form.Item>
            
            <Form.Item
              label={t('notifications.notificationMessage')}
              name="body"
              rules={[{ required: true, message: t('notifications.messageRequired') }]}
            >
              <Input.TextArea rows={3} placeholder={t('notifications.enterMessage')} />
            </Form.Item>
            
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit"
                icon={<SendOutlined />}
                loading={sendingTest}
                disabled={!pushEnabled}
              >
                {t('notifications.sendTestNotification')}
              </Button>
            </Form.Item>
          </Form>
          
          {fcmToken && (
            <div style={{ marginTop: 16 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                {t('notifications.deviceToken')}:
              </Text>
              <Text code copyable style={{ wordBreak: 'break-all' }}>
                {fcmToken}
              </Text>
            </div>
          )}
        </div>
      </Space>
    </Card>
  );
};

export default PushNotificationTester;
