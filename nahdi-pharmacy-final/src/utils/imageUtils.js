/**
 * Utility functions for handling images
 */

export const getPlaceholderImage = (width = 100, height = 100, text = 'No Image') => {
  // Use a simple SVG as a placeholder
  return `data:image/svg+xml;charset=UTF-8,%3Csvg width='${width}' height='${height}' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='12' text-anchor='middle' dominant-baseline='middle' fill='%23999'%3E${encodeURIComponent(text)}%3C/text%3E%3C/svg%3E`;
};

export const handleImageError = (e, placeholderText = 'No Image') => {
  const target = e.target;
  if (target.tagName.toLowerCase() === 'img') {
    target.src = getPlaceholderImage(
      target.width || 100, 
      target.height || 100, 
      placeholderText
    );
    target.onerror = null; // Prevent infinite loop if the placeholder fails
  }
};
