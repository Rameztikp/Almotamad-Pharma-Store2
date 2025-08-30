import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, message, Alert, Typography } from 'antd';
import { BellOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useUserAuth } from '../context/UserAuthContext';
import usePushNotifications from '../hooks/usePushNotifications';
import api from '../services/api';

const { Title, Text } = Typography;

const TestPushPage = () => {
  const { t } = useTranslation('notifications');
  const { user } = useUserAuth();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);
  
  const {
    isSupported,
    isPermissionGranted,
    isSubscribed,
    subscribeUser,
    unsubscribeUser,
    fcmToken,
    error: fcmError
  } = usePushNotifications();

  useEffect(() => {
    if (fcmError) {
      setError(fcmError);
    }
  }, [fcmError]);

  const handleTestNotification = async () => {
    if (!isSupported) {
      setError(t('push_notifications.not_supported'));
      return;
    }

    if (!isPermissionGranted) {
      setError(t('push_notifications.permission_denied'));
      return;
    }

    setIsTesting(true);
    setError(null);
    setTestResult(null);

    try {
      // First ensure we're subscribed
      if (!isSubscribed) {
        await subscribeUser();
      }

      // Send test notification
      const response = await api.post('/api/fcm/test', {
        title: t('test_notification.title'),
        body: t('test_notification.body'),
        data: {
          type: 'test',
          userId: user?.id,
          timestamp: new Date().toISOString()
        }
      });

      setTestResult({
        success: true,
        message: t('test_notification.sent_success')
      });
      message.success(t('test_notification.sent_success'));
    } catch (err) {
      console.error('Test notification error:', err);
      const errorMessage = err.response?.data?.error || err.message || t('test_notification.send_error');
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Title level={2} className="text-center mb-6">
        {t('test_notification.page_title')}
      </Title>
      
      <Card className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <BellOutlined className="text-4xl text-blue-500 mb-4" />
          <Title level={4} className="mb-2">
            {t('test_notification.test_push_notification')}
          </Title>
          <Text type="secondary" className="block mb-6">
            {t('test_notification.test_description')}
          </Text>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Text strong>{t('push_notifications.status')}:</Text>
              <span className={`inline-flex items-center ${isSupported ? 'text-green-600' : 'text-red-600'}`}>
                {isSupported ? (
                  <>
                    <CheckCircleOutlined className="mr-1" />
                    {t('push_notifications.supported')}
                  </>
                ) : (
                  <>
                    <CloseCircleOutlined className="mr-1" />
                    {t('push_notifications.not_supported')}
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between mb-2">
              <Text strong>{t('push_notifications.permission')}:</Text>
              <span className={isPermissionGranted ? 'text-green-600' : 'text-yellow-600'}>
                {isPermissionGranted 
                  ? t('push_notifications.permission_granted')
                  : t('push_notifications.permission_denied')}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <Text strong>{t('push_notifications.subscription')}:</Text>
              <span className={isSubscribed ? 'text-green-600' : 'text-gray-600'}>
                {isSubscribed 
                  ? t('push_notifications.subscribed')
                  : t('push_notifications.not_subscribed')}
              </span>
            </div>
          </div>

          {error && (
            <Alert 
              message={t('common.error')}
              description={error}
              type="error" 
              showIcon
              className="mb-4"
            />
          )}

          {testResult?.success && (
            <Alert
              message={t('common.success')}
              description={testResult.message}
              type="success"
              showIcon
              className="mb-4"
            />
          )}

          <div className="flex justify-center mt-6">
            <Button
              type="primary"
              size="large"
              icon={<BellOutlined />}
              loading={isTesting}
              onClick={handleTestNotification}
              disabled={!isSupported || !isPermissionGranted}
            >
              {t('test_notification.send_test')}
            </Button>
          </div>
        </div>
      </Card>

      <div className="mt-8 max-w-2xl mx-auto">
        <Title level={4} className="mb-4">
          {t('test_notification.troubleshooting')}
        </Title>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>{t('test_notification.tips.allow_notifications')}</li>
          <li>{t('test_notification.tips.check_internet')}</li>
          <li>{t('test_notification.tips.try_again')}</li>
          <li>{t('test_notification.tips.contact_support')}</li>
        </ul>
      </div>
    </div>
  );
};

export default TestPushPage;
