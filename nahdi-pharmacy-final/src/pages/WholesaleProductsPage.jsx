import React from 'react';
import InteractiveProductsPage from '../components/InteractiveProductsPage';

const WholesaleProductsPage = () => {
  return (
    <div className="container mx-auto py-8">
      <InteractiveProductsPage productType="wholesale" />
    </div>
  );
};

export default WholesaleProductsPage;
