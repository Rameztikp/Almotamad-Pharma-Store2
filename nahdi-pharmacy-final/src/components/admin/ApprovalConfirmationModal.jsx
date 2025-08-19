import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, X, AlertTriangle } from 'lucide-react';

const ApprovalConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  customerName, 
  companyName,
  isLoading = false 
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-md bg-white border border-gray-200 shadow-lg"
        aria-describedby="approval-description approval-details"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />
            <span>تأكيد قبول طلب الترقية</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 text-right">
          <div id="approval-description" className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-gray-700 leading-relaxed">
              هل أنت متأكد من قبول ترقية هذا العميل لحساب الجملة؟
            </p>
          </div>
          
          <div id="approval-details" className="space-y-2 text-sm text-gray-600" role="region" aria-label="تفاصيل طلب الترقية">
            <div className="flex justify-between items-center">
              <span className="font-medium">{customerName}</span>
              <span>اسم العميل:</span>
            </div>
            {companyName && (
              <div className="flex justify-between items-center">
                <span className="font-medium">{companyName}</span>
                <span>اسم الشركة:</span>
              </div>
            )}
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>ملاحظة:</strong> سيتم منح العميل صلاحية الشراء من قسم الجملة مع الاحتفاظ بنوع حسابه الأصلي (تجزئة).
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2 justify-start">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={isLoading}
            className="flex items-center gap-2"
            aria-label="إلغاء العملية"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            إلغاء
          </Button>
          
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            aria-label="تأكيد قبول الطلب"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                جاري المعالجة...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                تأكيد القبول
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApprovalConfirmationModal;
