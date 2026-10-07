import { motion } from 'framer-motion';
import { FiX, FiPrinter, FiCheckCircle } from 'react-icons/fi';
import type { FeePayment } from '../../types';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';

interface ReceiptModalProps {
  payment: FeePayment;
  onClose: () => void;
}

export function ReceiptModal({ payment, onClose }: ReceiptModalProps) {
  const { settings } = useStore();

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fee Receipt - ${payment.receiptNo}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1f2937; }
            .receipt-card { border: 2px solid #e5e7eb; border-radius: 16px; padding: 32px; max-w: 650px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px border-dashed #e5e7eb; padding-bottom: 20px; margin-bottom: 24px; }
            .logo { font-size: 24px; font-weight: bold; color: #4f46e5; margin-bottom: 4px; }
            .sub-header { font-size: 13px; color: #6b7280; }
            .badge { display: inline-block; padding: 4px 12px; background: #dcfce7; color: #15803d; border-radius: 999px; font-size: 12px; font-weight: bold; margin-top: 10px; }
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; font-size: 14px; }
            .field-label { color: #6b7280; font-size: 12px; font-weight: 500; }
            .field-val { font-weight: 600; margin-top: 2px; }
            .amount-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px; }
            .amount-title { font-size: 12px; color: #6b7280; }
            .amount-val { font-size: 28px; font-weight: 800; color: #4f46e5; margin-top: 4px; }
            .footer { border-top: 1px solid #e5e7eb; pt-16px; margin-top: 24px; font-size: 12px; color: #9ca3af; text-align: center; }
          </style>
        </head>
        <body>
          <div class="receipt-card">
            <div class="header">
              <div class="logo">${settings.instituteName || 'Vertex Institute'}</div>
              <div class="sub-header">Fee Payment Acknowledgment Receipt</div>
              <div class="badge">✓ Payment Received</div>
            </div>

            <div class="details-grid">
              <div>
                <div class="field-label">Receipt Number</div>
                <div class="field-val">${payment.receiptNo}</div>
              </div>
              <div>
                <div class="field-label">Payment Date</div>
                <div class="field-val">${payment.paymentDate}</div>
              </div>
              <div>
                <div class="field-label">Student Name</div>
                <div class="field-val">${payment.studentName}</div>
              </div>
              <div>
                <div class="field-label">Roll Number</div>
                <div class="field-val">${payment.rollNumber}</div>
              </div>
              <div>
                <div class="field-label">Branch & Academic Session</div>
                <div class="field-val">${payment.branch} (${payment.year}, ${payment.semester})</div>
              </div>
              <div>
                <div class="field-label">Fee Type</div>
                <div class="field-val">${payment.feeType}</div>
              </div>
              <div>
                <div class="field-label">Payment Method</div>
                <div class="field-val">${payment.paymentMethod}</div>
              </div>
              <div>
                <div class="field-label">Transaction / Ref ID</div>
                <div class="field-val">${payment.transactionId}</div>
              </div>
            </div>

            <div class="amount-box">
              <div class="amount-title">Total Paid Amount</div>
              <div class="amount-val">₹${payment.amount.toLocaleString()}</div>
            </div>

            <div class="details-grid">
              <div>
                <div class="field-label">Collected By</div>
                <div class="field-val">${payment.collectedBy} (${payment.collectedByRole.toUpperCase()})</div>
              </div>
              <div>
                <div class="field-label">Remarks</div>
                <div class="field-val">${payment.remarks || 'None'}</div>
              </div>
            </div>

            <div class="footer">
              Computer Generated Receipt • Vertex Attendance & Fee Management System • Valid without physical signature.
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700"
      >
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiCheckCircle className="text-emerald-500 w-5 h-5" />
            <h3 className="font-bold text-gray-800 dark:text-white">Fee Payment Receipt</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="text-center pb-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{settings.instituteName || 'Vertex Institute'}</h2>
            <p className="text-xs text-gray-500">Official Payment Receipt</p>
            <span className="inline-block mt-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-full border border-emerald-200 dark:border-emerald-800">
              Receipt No: {payment.receiptNo}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-400 block mb-0.5">Student Name</span>
              <span className="font-bold text-gray-800 dark:text-white text-sm">{payment.studentName}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Roll Number</span>
              <span className="font-bold text-gray-800 dark:text-white text-sm">{payment.rollNumber}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Branch & Class</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{payment.branch} ({payment.year}, {payment.semester})</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Payment Date</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{payment.paymentDate}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Fee Type</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{payment.feeType}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Payment Method</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{payment.paymentMethod}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-400 block mb-0.5">Transaction ID</span>
              <span className="font-mono text-gray-700 dark:text-gray-300">{payment.transactionId}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40 text-center">
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium block">Amount Paid</span>
            <span className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-300 mt-0.5 block">
              ₹{payment.amount.toLocaleString()}
            </span>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>Collected By:</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{payment.collectedBy} ({payment.collectedByRole.toUpperCase()})</span>
            </div>
            {payment.remarks && (
              <div className="flex justify-between">
                <span>Remarks:</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">{payment.remarks}</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="primary" onClick={handlePrint} icon={<FiPrinter />}>Print Receipt</Button>
        </div>
      </motion.div>
    </div>
  );
}
