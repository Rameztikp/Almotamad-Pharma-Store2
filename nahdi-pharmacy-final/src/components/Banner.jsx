import React from 'react';
import { Link } from 'react-router-dom';

const Banner = ({ banner }) => {
  return (
    <div className="relative rounded-lg overflow-hidden mb-8">
      <img 
        src={banner.image} 
        alt={banner.title}
        className="w-full h-64 object-cover"
      />
      <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col justify-center items-start p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">{banner.title}</h2>
        <p className="text-lg mb-4">{banner.description}</p>
        <Link 
          to={banner.buttonLink}
          className="bg-white text-primary-600 px-6 py-2 rounded-md font-medium hover:bg-gray-100 transition-colors"
        >
          {banner.buttonText}
        </Link>
      </div>
    </div>
  );
};

export default Banner;
