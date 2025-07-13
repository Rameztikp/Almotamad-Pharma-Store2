import { useContext } from 'react';
import { ShopContext } from './ShopContext';

export const useShop = () => {
  return useContext(ShopContext);
};
