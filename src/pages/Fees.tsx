import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiPieChart, FiLayers, FiUsers, FiClock } from 'react-icons/fi';
import { FeesDashboard } from '../components/fees/FeesDashboard';
import { FeeStructureList } from '../components/fees/FeeStructureList';
import { StudentFeesList } from '../components/fees/StudentFeesList';
import { PaymentHistoryList } from '../components/fees/PaymentHistoryList';

type FeesTab = 'dashboard' | 'structure' | 'students' | 'history';

export default function Fees() {
  const [activeTab, setActiveTab] = useState<FeesTab>('dashboard');
  const [historyRollFilter, setHistoryRollFilter] = useState<string>('');

  const handleViewStudentHistory = (rollNumber: string) => {
    setHistoryRollFilter(rollNumber);
    setActiveTab('history');
  };

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: <FiPieChart /> },
    { id: 'structure' as const, label: 'Fee Structure', icon: <FiLayers /> },
    { id: 'students' as const, label: 'Student Fees', icon: <FiUsers /> },
    { id: 'history' as const, label: 'Payment History', icon: <FiClock /> },
  ];

  return (
    <div className="space-y-5">
      {/* Header & Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Fees Management</h1>
          <p className="text-xs text-gray-500">Track fee structures, student dues, collection, and payment receipts.</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id !== 'history') setHistoryRollFilter('');
                  setActiveTab(tab.id);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Contents */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        {activeTab === 'dashboard' && <FeesDashboard />}
        {activeTab === 'structure' && <FeeStructureList />}
        {activeTab === 'students' && <StudentFeesList onViewHistory={handleViewStudentHistory} />}
        {activeTab === 'history' && <PaymentHistoryList initialRollNumber={historyRollFilter} />}
      </motion.div>
    </div>
  );
}
