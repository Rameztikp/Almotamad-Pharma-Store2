import React from 'react';
import { Button, Card, Typography, Space, Alert } from 'antd';
import { BellOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

const { Title, Text } = Typography;

const TestPushNotification = ({ userId }) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = React.useState(false);
  const [testResult, setTestResult] = React.useState(null);
  const [error, setError] = React.useState(null);

  const sendTestNotification = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    setTestResult(null);

    try {
      await api.post('/fcm/test', { userId });
      setTestResult({
        success: true,
        message: t('notifications.testNotificationSent')
      });
    } catch (err) {
      console.error('Error sending test notification:', err);
      setError(err.response?.data?.message || t('notifications.testNotificationFailed'));
      setTestResult({
        success: false,
        message: t('notifications.testNotificationFailed')
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card 
      title={
        <Space>
          <BellOutlined />
          <span>{t('notifications.testNotifications')}</span>
        </Space>
      }
      className="test-notification-card"
    >
      <div className="test-notification-content">
        <Text>
          {t('notifications.testNotificationDescription')}
        </Text>
        
        <div className="test-button-container">
          <Button 
            type="primary" 
            onClick={sendTestNotification}
            loading={isLoading}
            icon={<BellOutlined />}
            size="large"
          >
            {t('notifications.sendTestNotification')}
          </Button>
        </div>

        {testResult && (
          <Alert
            message={
              <Space>
                {testResult.success ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                )}
                <span>{testResult.message}</span>
              </Space>
            }
            type={testResult.success ? 'success' : 'error'}
            showIcon
            style={{ marginTop: 16 }}
          />
        )}

        {error && (
          <Alert
            message={t('common.error')}
            description={error}
            type="error"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </div>

      <style jsx>{`
        .test-notification-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .test-button-container {
          margin-top: 16px;
          display: flex;
          justify-content: center;
        }
        
        @media (max-width: 768px) {
          .test-button-container {
            flex-direction: column;
            gap: 12px;
          }
          
          .test-button-container button {
            width: 100%;
          }
        }
      `}</style>
    </Card>
  );
};

export default TestPushNotification;
