import React from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, Typography, Row, Col, Card, Divider, Button } from 'antd';
import { BellOutlined, UserOutlined, LockOutlined, CreditCardOutlined, NotificationOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import NotificationSettings from '../components/NotificationSettings';
import TestPushNotification from '../components/TestPushNotification';
import ProtectedRoute from '../components/ProtectedRoute';

const { Title } = Typography;
const { TabPane } = Tabs;

const SettingsPage = () => {
  const { t } = useTranslation();
  const { tab = 'profile' } = useParams();
  const navigate = useNavigate();
  
  // Get current user ID from your auth context or API
  // This is a placeholder - replace with your actual auth context
  const currentUser = { id: 'user123' }; // Replace with actual user data

  return (
    <div className="settings-page">
      <Title level={2} className="page-title">{t('settings.title')}</Title>
      
      <Row gutter={[24, 24]}>
        <Col xs={24} md={18} lg={20}>
          <Card className="settings-container">
            <Tabs 
              defaultActiveKey={tab} 
              type="card"
              className="settings-tabs"
              onChange={(key) => {
                // Update URL when tab changes
                window.history.pushState({}, '', `/settings/${key}`);
              }}
            >
              <TabPane
                tab={
                  <span>
                    <UserOutlined />
                    {t('settings.profile')}
                  </span>
                }
                key="profile"
              >
                <div className="tab-content">
                  <Title level={4}>{t('settings.profileSettings')}</Title>
                  <p>{t('settings.profileDescription')}</p>
                  {/* Add profile settings form here */}
                </div>
              </TabPane>

              <TabPane
                tab={
                  <span>
                    <BellOutlined />
                    {t('settings.notifications')}
                  </span>
                }
                key="notifications"
              >
                <div className="tab-content">
                  <Title level={4}>{t('settings.notificationSettings')}</Title>
                  <p>{t('settings.notificationDescription')}</p>
                  <Divider />
                  <NotificationSettings userId={currentUser.id} />
                  <Divider />
                  <TestPushNotification userId={currentUser.id} />
                </div>
              </TabPane>

              <TabPane
                tab={
                  <span>
                    <NotificationOutlined />
                    {t('settings.testNotifications')}
                  </span>
                }
                key="test-notifications"
              >
                <div className="tab-content">
                  <Title level={4}>{t('settings.testNotificationSettings')}</Title>
                  <p>{t('settings.testNotificationDescription')}</p>
                  <Divider />
                  <Button 
                    type="primary" 
                    icon={<NotificationOutlined />}
                    onClick={() => navigate('/test-push')}
                  >
                    {t('settings.goToTestPage')}
                  </Button>
                </div>
              </TabPane>

              <TabPane
                tab={
                  <span>
                    <LockOutlined />
                    {t('settings.security')}
                  </span>
                }
                key="security"
              >
                <div className="tab-content">
                  <Title level={4}>{t('settings.securitySettings')}</Title>
                  <p>{t('settings.securityDescription')}</p>
                  {/* Add security settings here */}
                </div>
              </TabPane>

              <TabPane
                tab={
                  <span>
                    <CreditCardOutlined />
                    {t('settings.billing')}
                  </span>
                }
                key="billing"
              >
                <div className="tab-content">
                  <Title level={4}>{t('settings.billingSettings')}</Title>
                  <p>{t('settings.billingDescription')}</p>
                  {/* Add billing settings here */}
                </div>
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>

      <style jsx>{`
        .settings-page {
          padding: 24px;
        }
        
        .page-title {
          margin-bottom: 24px;
        }
        
        .settings-container {
          border-radius: 8px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        
        .settings-tabs :global(.ant-tabs-nav) {
          margin-bottom: 24px;
        }
        
        .tab-content {
          padding: 8px;
        }
        
        @media (max-width: 768px) {
          .settings-page {
            padding: 16px;
          }
          
          .settings-container {
            border-radius: 0;
          }
        }
      `}</style>
    </div>
  );
};

// Wrap with ProtectedRoute to ensure user is authenticated
const ProtectedSettingsPage = () => (
  <ProtectedRoute>
    <SettingsPage />
  </ProtectedRoute>
);

export default ProtectedSettingsPage;
