import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiHardDrive, FiRefreshCw, FiDatabase, FiFolder, FiAlertCircle, FiInfo, FiLayers, FiServer, FiSettings } from 'react-icons/fi';
import { Button } from '../ui/Button';
import { fetchStorageMetrics, StorageMetrics } from '../../services/storageService';
import { useStore } from '../../store/useStore';
import { useToast } from '../../hooks/useToast';

const PRESET_QUOTAS = [
  { label: '500 MB (Supabase Free Tier)', value: 500 },
  { label: '1 GB (Standard Plan)', value: 1024 },
  { label: '5 GB (Pro Plan)', value: 5120 },
  { label: '10 GB', value: 10240 },
  { label: '50 GB', value: 51200 },
  { label: '100 GB (Enterprise Tier)', value: 102400 },
];

export default function StorageSection() {
  const { settings, updateSettings } = useStore();
  const toast = useToast();
  
  const quotaMb = settings?.storageQuotaMb || 500;

  const [metrics, setMetrics] = useState<StorageMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showQuotaConfig, setShowQuotaConfig] = useState<boolean>(false);
  const [customQuotaInput, setCustomQuotaInput] = useState<string>(String(quotaMb));

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStorageMetrics(quotaMb);
      setMetrics(data);
    } catch (err: any) {
      setError(err?.message || 'Unable to load storage information.');
    } finally {
      setLoading(false);
    }
  }, [quotaMb]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleQuotaChange = (newQuota: number) => {
    if (newQuota <= 0) return;
    updateSettings({ storageQuotaMb: newQuota });
    toast.success(`Storage quota updated to ${newQuota >= 1024 ? (newQuota / 1024).toFixed(1) + ' GB' : newQuota + ' MB'}`);
  };

  const handleCustomQuotaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customQuotaInput);
    if (!val || val <= 0) {
      toast.error('Please enter a valid positive storage limit in MB');
      return;
    }
    handleQuotaChange(val);
    setShowQuotaConfig(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
            <FiHardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-800 dark:text-white">Storage</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Monitor total capacity, used bytes, and free remaining storage.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowQuotaConfig(!showQuotaConfig)}
            variant="outline"
            size="sm"
            icon={<FiSettings className="w-4 h-4" />}
          >
            Quota Plan
          </Button>

          <Button
            onClick={loadData}
            loading={loading}
            variant="outline"
            size="sm"
            icon={<FiRefreshCw className={loading ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Plan Quota Configurator Panel */}
      {showQuotaConfig && (
        <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 border-b border-indigo-100 dark:border-indigo-900/30 transition-all">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">Configure Plan Storage Quota</h4>
              <p className="text-xs text-indigo-700/70 dark:text-indigo-400">Select your Supabase project plan quota to accurately track remaining capacity.</p>
            </div>

            <form onSubmit={handleCustomQuotaSubmit} className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={PRESET_QUOTAS.some(p => p.value === quotaMb) ? quotaMb : 'custom'}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setCustomQuotaInput(String(quotaMb));
                  } else {
                    handleQuotaChange(Number(e.target.value));
                  }
                }}
                className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
              >
                {PRESET_QUOTAS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
                <option value="custom">Custom Quota...</option>
              </select>

              {!PRESET_QUOTAS.some(p => p.value === quotaMb) && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={customQuotaInput}
                    onChange={(e) => setCustomQuotaInput(e.target.value)}
                    placeholder="MB"
                    className="w-20 px-2.5 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
                  />
                  <span className="text-xs text-gray-500">MB</span>
                  <Button type="submit" size="sm" variant="primary">Set</Button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Loading Skeleton */}
        {loading && !metrics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2 mb-3"></div>
                  <div className="h-7 bg-gray-300 dark:bg-gray-500 rounded w-3/4"></div>
                </div>
              ))}
            </div>
            <div className="p-5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-500 rounded w-full"></div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-center space-y-3">
            <div className="inline-flex items-center justify-center p-3 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full">
              <FiAlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-red-800 dark:text-red-300 text-sm">Unable to load storage information.</h4>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1 max-w-md mx-auto">{error}</p>
            </div>
            <div>
              <Button onClick={loadData} variant="outline" size="sm" icon={<FiRefreshCw />}>
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Main Content */}
        {metrics && !error && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Storage Card */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>Total Storage</span>
                  <FiServer className="w-4 h-4 text-gray-400" />
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {metrics.formattedQuota}
                </p>
                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                  Project Plan Allocation
                </span>
              </div>

              {/* Used Storage Card */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>Used Storage</span>
                  <FiHardDrive className="w-4 h-4 text-indigo-500" />
                </div>
                <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  {metrics.formattedUsed}
                </p>
                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                  Database & Cloud Files
                </span>
              </div>

              {/* Free Storage Card */}
              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/40">
                <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 mb-1 font-medium">
                  <span>Free / Available</span>
                  <FiDatabase className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {metrics.formattedFree}
                </p>
                <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/70">
                  {(100 - metrics.usagePercentage).toFixed(2)}% Available Space
                </span>
              </div>

              {/* Usage Rate Card */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>Usage Rate</span>
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {metrics.usagePercentage}%
                </p>
                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                  {metrics.totalItemsCount.toLocaleString()} Total Records
                </span>
              </div>
            </div>

            {/* Storage Usage Progress Bar */}
            <div className="p-5 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-800 dark:text-white">Storage Capacity & Usage</span>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">{metrics.formattedUsed}</span> used of <span className="font-bold">{metrics.formattedQuota}</span>
                </span>
              </div>

              {/* Bar */}
              <div className="w-full h-3.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(0.5, Math.min(100, metrics.usagePercentage))}%`
                  }}
                ></div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-0.5">
                <span>
                  <strong className="text-indigo-600 dark:text-indigo-400">{metrics.usagePercentage}% Used</strong> • {metrics.formattedUsed} consumed
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {metrics.formattedFree} Free Remaining
                </span>
              </div>
            </div>

            {/* Application Storage Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Application Storage Breakdown ({metrics.categories.length} Components)
              </h4>
              <div className="divide-y divide-gray-100 dark:divide-gray-700 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
                {metrics.categories.map((item) => (
                  <div key={item.id} className="p-3.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        item.type === 'database_table'
                          ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                          : 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {item.type === 'database_table' ? <FiDatabase className="w-4 h-4" /> : <FiFolder className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{item.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                          <span>{item.itemCount.toLocaleString()} {item.type === 'database_table' ? 'records' : 'files'}</span>
                          <span>•</span>
                          <span className="font-medium text-gray-600 dark:text-gray-300">
                            {item.type === 'database_table' ? 'PostgreSQL Table' : 'Supabase Bucket'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-800 dark:text-white">{item.formattedSize}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
