import React, { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

const CategoryRoute = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (slug) {
      // Preserve other query params if any
      const search = new URLSearchParams(location.search);
      search.set('category', slug);
      navigate({ pathname: '/products', search: `?${search.toString()}` }, { replace: true });
    } else {
      navigate('/products', { replace: true });
    }
  }, [slug, navigate, location.search]);

  return null;
};

export default CategoryRoute;
