import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Switch, Divider, Typography, Space, Button, Alert, Spin } from 'antd';
import { BellOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import usePushNotifications from '../hooks/usePushNotifications';

const { Title, Text } = Typography;

const NotificationSettings = ({ userId }) => {
  const { t } = useTranslation();
  const [browserSupported, setBrowserSupported] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const {
    isSupported,
    isSubscribed,
    isLoading: isPushLoading,
    error,
    subscribe,
  } = usePushNotifications(userId);

  useEffect(() => {
    // Check browser support
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setBrowserSupported(supported);

    // Check current permission status
    if (supported) {
      setPermissionGranted(Notification.permission === 'granted');
    }

    setIsLoading(false);
  }, []);

  const handleTogglePushNotifications = async (checked) => {
    if (checked) {
      await subscribe();
    } else {
      // Handle unsubscribe if needed
      // This would require additional implementation to remove the token from your server
      toast.info(t('notifications.unsubscribeInfo'));
    }
  };

  const requestPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      setPermissionGranted(permission === 'granted');
      
      if (permission === 'granted') {
        await subscribe();
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!browserSupported) {
    return (
      <Alert
        type="warning"
        message={t('notifications.browserNotSupported')}
        description={t('notifications.useModernBrowser')}
        showIcon
      />
    );
  }

  return (
    <Card 
      title={
        <Space>
          <BellOutlined />
          <span>{t('notifications.settings')}</span>
        </Space>
      }
      className="notification-settings"
    >
      <div className="notification-setting-item">
        <div className="setting-info">
          <Title level={5}>{t('notifications.pushNotifications')}</Title>
          <Text type="secondary">
            {t('notifications.pushNotificationsDescription')}
          </Text>
        </div>
        
        <div className="setting-actions">
          {!permissionGranted ? (
            <Button 
              type="primary" 
              onClick={requestPermission}
              loading={isPushLoading}
            >
              {t('notifications.enablePushNotifications')}
            </Button>
          ) : (
            <div className="permission-status">
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <Text type="success">{t('notifications.permissionGranted')}</Text>
              </Space>
              <Switch 
                checked={isSubscribed}
                onChange={handleTogglePushNotifications}
                loading={isPushLoading}
                style={{ marginLeft: 16 }}
              />
            </div>
          )}
        </div>
      </div>

      <Divider />

      <div className="notification-setting-item">
        <div className="setting-info">
          <Title level={5}>{t('notifications.emailNotifications')}</Title>
          <Text type="secondary">
            {t('notifications.emailNotificationsDescription')}
          </Text>
        </div>
        <div className="setting-actions">
          <Switch defaultChecked disabled />
        </div>
      </div>

      <Divider />

      <div className="notification-setting-item">
        <div className="setting-info">
          <Title level={5}>{t('notifications.smsNotifications')}</Title>
          <Text type="secondary">
            {t('notifications.smsNotificationsDescription')}
          </Text>
        </div>
        <div className="setting-actions">
          <Switch defaultChecked disabled />
        </div>
      </div>

      {error && (
        <Alert
          message={t('common.error')}
          description={error.message || t('notifications.errorLoadingSettings')}
          type="error"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}

      <style jsx>{`
        .notification-setting-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }
        
        .setting-info {
          flex: 1;
          margin-right: 24px;
        }
        
        .setting-actions {
          display: flex;
          align-items: center;
        }
        
        .permission-status {
          display: flex;
          align-items: center;
        }
        
        @media (max-width: 768px) {
          .notification-setting-item {
            flex-direction: column;
          }
          
          .setting-actions {
            margin-top: 12px;
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </Card>
  );
};

export default NotificationSettings;
