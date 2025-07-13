import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Filter, 
  Grid, 
  List, 
  Star, 
  Heart, 
  ShoppingCart, 
  ChevronDown,
  SlidersHorizontal
} from 'lucide-react'

const ProductsPage = () => {
  const [searchParams] = useSearchParams()
  const [viewMode, setViewMode] = useState('grid')
  const [sortBy, setSortBy] = useState('newest')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    priceRange: [0, 1000],
    brands: [],
    sizes: [],
    ages: [],
    inStock: false
  })

  const category = searchParams.get('category') || 'all'
  
  // Mock products data
  const products = [
    {
      id: 1,
      name: 'فيتامين د 5000 وحدة دولية',
      brand: 'Nature Made',
      price: 45.50,
      originalPrice: 65.00,
      discount: 30,
      rating: 4.8,
      reviews: 124,
      inStock: true,
      category: 'vitamins',
      size: '100 كبسولة',
      age: 'للبالغين',
      image: '/api/placeholder/200/200'
    },
    {
      id: 2,
      name: 'كريم مرطب للوجه بفيتامين E',
      brand: 'Neutrogena',
      price: 89.99,
      originalPrice: 120.00,
      discount: 25,
      rating: 4.6,
      reviews: 89,
      inStock: true,
      category: 'cosmetics',
      size: '50ml',
      age: 'للجميع',
      image: '/api/placeholder/200/200'
    },
    {
      id: 3,
      name: 'شامبو للأطفال خالي من الدموع',
      brand: 'Johnson\'s Baby',
      price: 32.75,
      originalPrice: 42.00,
      discount: 22,
      rating: 4.9,
      reviews: 156,
      inStock: true,
      category: 'baby',
      size: '300ml',
      age: '0-3 سنوات',
      image: '/api/placeholder/200/200'
    },
    {
      id: 4,
      name: 'عطر رجالي فاخر',
      brand: 'Hugo Boss',
      price: 299.00,
      originalPrice: 399.00,
      discount: 25,
      rating: 4.7,
      reviews: 67,
      inStock: false,
      category: 'perfumes',
      size: '100ml',
      age: 'للرجال',
      image: '/api/placeholder/200/200'
    },
    {
      id: 5,
      name: 'مقياس ضغط الدم الرقمي',
      brand: 'Omron',
      price: 189.00,
      originalPrice: 220.00,
      discount: 14,
      rating: 4.5,
      reviews: 43,
      inStock: true,
      category: 'medical',
      size: 'متوسط',
      age: 'للبالغين',
      image: '/api/placeholder/200/200'
    },
    {
      id: 6,
      name: 'مسكن الألم باراسيتامول',
      brand: 'Panadol',
      price: 12.50,
      originalPrice: 15.00,
      discount: 17,
      rating: 4.3,
      reviews: 234,
      inStock: true,
      category: 'medicines',
      size: '20 قرص',
      age: 'للبالغين',
      image: '/api/placeholder/200/200'
    }
  ]

  const brands = ['Nature Made', 'Neutrogena', 'Johnson\'s Baby', 'Hugo Boss', 'Omron', 'Panadol']
  const sizes = ['50ml', '100ml', '300ml', '20 قرص', '100 كبسولة', 'متوسط']
  const ages = ['للجميع', 'للبالغين', '0-3 سنوات', 'للرجال', 'للنساء']

  const getCategoryName = (cat) => {
    const categories = {
      'all': 'جميع المنتجات',
      'new': 'وصل حديثاً',
      'trending': 'الأكثر مبيعاً',
      'medicines': 'الأدوية',
      'cosmetics': 'التجميل',
      'perfumes': 'العطور',
      'baby': 'منتجات الأطفال',
      'medical': 'المستلزمات الطبية',
      'vitamins': 'الفيتامينات'
    }
    return categories[cat] || 'المنتجات'
  }

  const ProductCard = ({ product }) => (
    <Card className="hover:shadow-lg transition-shadow duration-300 group">
      <CardContent className="p-0">
        <div className="relative">
          <div className="w-full h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
            <span className="text-gray-500">صورة المنتج</span>
          </div>
          {product.discount > 0 && (
            <Badge className="absolute top-2 right-2 bg-red-500">
              -{product.discount}%
            </Badge>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-2 left-2 w-8 h-8 p-0 bg-white/80 hover:bg-white"
          >
            <Heart className="w-4 h-4" />
          </Button>
          {!product.inStock && (
            <div className="absolute inset-0 bg-black/50 rounded-t-lg flex items-center justify-center">
              <span className="text-white font-semibold">غير متوفر</span>
            </div>
          )}
        </div>
        
        <div className="p-4">
          <div className="text-sm text-gray-500 mb-1">{product.brand}</div>
          <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2">
            {product.name}
          </h3>
          
          <div className="flex items-center gap-1 mb-2">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm text-gray-600">
              {product.rating} ({product.reviews})
            </span>
          </div>
          
          <div className="text-xs text-gray-500 mb-2">
            {product.size} • {product.age}
          </div>
          
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg font-bold text-green-600">
              {product.price} ر.ي
            </span>
            {product.originalPrice > product.price && (
              <span className="text-sm text-gray-500 line-through">
                {product.originalPrice} ر.ي
              </span>
            )}
          </div>
          
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={!product.inStock}
          >
            <ShoppingCart className="ml-2 w-4 h-4" />
            {product.inStock ? 'أضف للسلة' : 'غير متوفر'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <span>الرئيسية</span>
          <span>/</span>
          <span className="text-blue-600 font-medium">{getCategoryName(category)}</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {getCategoryName(category)}
            </h1>
            <p className="text-gray-600">
              عرض {products.length} منتج
            </p>
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            {/* Sort Dropdown */}
            <div className="relative">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">وصل حديثاً</option>
                <option value="price-low">السعر: من الأقل إلى الأعلى</option>
                <option value="price-high">السعر: من الأعلى إلى الأقل</option>
                <option value="rating">الأعلى تقييماً</option>
                <option value="popular">الأكثر مبيعاً</option>
              </select>
              <ChevronDown className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            </div>

            {/* View Mode Toggle */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-none"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            {/* Mobile Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden"
            >
              <SlidersHorizontal className="w-4 h-4 ml-2" />
              فلترة
            </Button>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <div className={`w-full md:w-64 flex-shrink-0 ${showFilters ? 'block' : 'hidden md:block'}`}>
            <Card className="sticky top-4">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">الفلاتر</h3>
                  <Filter className="w-5 h-5 text-gray-500" />
                </div>

                {/* Price Range */}
                <div className="mb-6">
                  <h4 className="font-medium mb-3">نطاق السعر</h4>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="من"
                      className="text-sm"
                      value={filters.priceRange[0]}
                      onChange={(e) => setFilters({
                        ...filters,
                        priceRange: [parseInt(e.target.value) || 0, filters.priceRange[1]]
                      })}
                    />
                    <Input
                      type="number"
                      placeholder="إلى"
                      className="text-sm"
                      value={filters.priceRange[1]}
                      onChange={(e) => setFilters({
                        ...filters,
                        priceRange: [filters.priceRange[0], parseInt(e.target.value) || 1000]
                      })}
                    />
                  </div>
                </div>

                {/* Brands */}
                <div className="mb-6">
                  <h4 className="font-medium mb-3">العلامة التجارية</h4>
                  <div className="space-y-2">
                    {brands.map((brand) => (
                      <label key={brand} className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 ml-2"
                          checked={filters.brands.includes(brand)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters({
                                ...filters,
                                brands: [...filters.brands, brand]
                              })
                            } else {
                              setFilters({
                                ...filters,
                                brands: filters.brands.filter(b => b !== brand)
                              })
                            }
                          }}
                        />
                        <span className="text-sm">{brand}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Sizes */}
                <div className="mb-6">
                  <h4 className="font-medium mb-3">الحجم</h4>
                  <div className="space-y-2">
                    {sizes.map((size) => (
                      <label key={size} className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 ml-2"
                          checked={filters.sizes.includes(size)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters({
                                ...filters,
                                sizes: [...filters.sizes, size]
                              })
                            } else {
                              setFilters({
                                ...filters,
                                sizes: filters.sizes.filter(s => s !== size)
                              })
                            }
                          }}
                        />
                        <span className="text-sm">{size}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Age Groups */}
                <div className="mb-6">
                  <h4 className="font-medium mb-3">الفئة العمرية</h4>
                  <div className="space-y-2">
                    {ages.map((age) => (
                      <label key={age} className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 ml-2"
                          checked={filters.ages.includes(age)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters({
                                ...filters,
                                ages: [...filters.ages, age]
                              })
                            } else {
                              setFilters({
                                ...filters,
                                ages: filters.ages.filter(a => a !== age)
                              })
                            }
                          }}
                        />
                        <span className="text-sm">{age}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* In Stock */}
                <div className="mb-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 ml-2"
                      checked={filters.inStock}
                      onChange={(e) => setFilters({
                        ...filters,
                        inStock: e.target.checked
                      })}
                    />
                    <span className="text-sm">متوفر فقط</span>
                  </label>
                </div>

                {/* Clear Filters */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setFilters({
                    priceRange: [0, 1000],
                    brands: [],
                    sizes: [],
                    ages: [],
                    inStock: false
                  })}
                >
                  مسح الفلاتر
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            <div className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                : 'grid-cols-1'
            }`}>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center mt-12">
              <div className="flex items-center gap-2">
                <Button variant="outline" disabled>
                  السابق
                </Button>
                <Button variant="default">1</Button>
                <Button variant="outline">2</Button>
                <Button variant="outline">3</Button>
                <Button variant="outline">
                  التالي
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductsPage

