import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { ArrowRight, X, Sparkles, Tag, Headset, Package, ShieldCheck, Info } from 'lucide-react';
import UpgradeToWholesaleForm from './UpgradeToWholesaleForm';
import { motion } from 'framer-motion';

const WholesaleUpgradeModal = ({ isOpen, onClose }) => {
  const [showForm, setShowForm] = useState(false);
  
  const handleUpgradeClick = () => {
    setShowForm(true);
  };
  
  const handleSuccess = () => {
    setShowForm(false);
    onClose();
  };
  
  const handleBack = () => {
    setShowForm(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border-0 shadow-2xl p-0 bg-white">
        {!showForm ? (
          <div className="relative">
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-primary to-blue-600 p-6 text-white">
              <div className="absolute top-4 right-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full h-8 w-8 hover:bg-white/20 text-white"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-3 bg-white/20 rounded-full">
                  <Sparkles className="h-8 w-8 text-yellow-300" />
                </div>
                <DialogTitle className="text-2xl font-bold mt-2">ترقية إلى حساب الجملة</DialogTitle>
                <DialogDescription className="text-blue-100">
                  استمتع بخصومات حصرية ومزايا خاصة بتجار الجملة
                </DialogDescription>
              </div>
            </div>
            
            {/* Features List */}
            <div className="p-6 space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900">ترقية حسابك إلى جملة</h3>
                <p className="mt-2 text-gray-600 text-base md:text-lg">استمتع بخصومات حصرية ومميزات خاصة مع حساب الجملة</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[45vh] overflow-y-auto pr-2">
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-blue-100 rounded-lg text-primary">
                    <Tag className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">خصومات حصرية</h4>
                    <p className="text-sm text-gray-500 mt-1">استفد من عروض خاصة بأسعار الجملة</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-green-100 rounded-lg text-green-600">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">طلب كميات كبيرة</h4>
                    <p className="text-sm text-gray-500 mt-1">إمكانية طلب كميات كبيرة بسهولة</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                    <Headset className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">دعم مخصص</h4>
                    <p className="text-sm text-gray-500 mt-1">فريق دعم فني مخصص لمساعدتك</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">حساب موثوق</h4>
                    <p className="text-sm text-gray-500 mt-1">حساب معتمد لتجار الجملة فقط</p>
                  </div>
                </div>
              </div>
              
              {/* Info Alert */}
              <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start gap-3">
                <div className="p-1 bg-blue-100 rounded-full">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                </div>
                <p className="text-sm text-blue-700">
                  سيتم مراجعة طلبك من قبل إدارة الموقع. سنقوم بالتواصل معك خلال 24-48 ساعة.
                </p>
              </div>
              
              {/* Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="h-12 px-6 font-medium rounded-lg border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  لاحقاً
                </Button>
                <Button 
                  onClick={handleUpgradeClick}
                  className="h-12 px-8 font-medium text-white bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  <span className="flex items-center gap-2">
                    الترقية الآن
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-bold text-gray-900">
                  طلب ترقية إلى حساب الجملة
                </DialogTitle>
                <button
                  onClick={handleBack}
                  className="rounded-full p-1 hover:bg-gray-100"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </DialogHeader>
            
            <div className="mt-6">
              <UpgradeToWholesaleForm 
                onSuccess={handleSuccess}
                onCancel={handleBack}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WholesaleUpgradeModal;
