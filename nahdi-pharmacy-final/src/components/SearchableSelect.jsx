import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown, FaSearch, FaTimes } from 'react-icons/fa';

const SearchableSelect = ({
  options = [],
  value,
  onChange,
  placeholder = 'اختر...',
  loading = false,
  disabled = false,
  noOptionsMessage = 'لا توجد خيارات متاحة'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const selectRef = useRef(null);

  // تحديث القيمة المحددة عند تغيير القيمة
  useEffect(() => {
    if (value) {
      const option = options.find(opt => opt.value === value);
      setSelectedOption(option || null);
    } else {
      setSelectedOption(null);
    }
  }, [value, options]);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // تصفية الخيارات بناءً على نص البحث
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (option) => {
    setSelectedOption(option);
    onChange(option.value);
    setSearchTerm('');
    setIsOpen(false);
  };

  const clearSelection = (e) => {
    e.stopPropagation();
    setSelectedOption(null);
    onChange('');
  };

  return (
    <div className="relative w-full" ref={selectRef}>
      <div
        className={`flex items-center justify-between w-full p-2 border rounded-lg cursor-pointer ${disabled ? 'bg-gray-100' : 'bg-white'} ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-300'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {selectedOption ? (
          <div className="flex-1 flex items-center">
            <span className="text-gray-900">{selectedOption.label}</span>
          </div>
        ) : (
          <span className="text-gray-500">{placeholder}</span>
        )}
        
        <div className="flex items-center space-x-2">
          {selectedOption && (
            <button
              type="button"
              onClick={clearSelection}
              className="text-gray-400 hover:text-gray-600"
              disabled={disabled}
            >
              <FaTimes size={14} />
            </button>
          )}
          <FaChevronDown 
            className={`text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} 
            size={14} 
          />
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 border-b">
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ابحث عن فئة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">جاري التحميل...</div>
            ) : filteredOptions.length > 0 ? (
              <ul>
                {filteredOptions.map((option) => (
                  <li
                    key={option.value}
                    className={`px-4 py-2 cursor-pointer hover:bg-blue-50 ${value === option.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                    onClick={() => handleSelect(option)}
                  >
                    {option.label}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-center text-gray-500">
                {searchTerm ? 'لا توجد نتائج' : noOptionsMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
