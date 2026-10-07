import { supabase, isSupabaseConfigured } from './supabase';

export interface StorageCategoryItem {
  id: string;
  name: string;
  type: 'database_table' | 'storage_bucket';
  itemCount: number;
  usedBytes: number;
  formattedSize: string;
  description: string;
}

export interface StorageMetrics {
  totalBuckets: number;
  totalDatabaseTables: number;
  totalItemsCount: number;
  usedBytes: number;
  databaseBytes: number;
  bucketBytes: number;
  formattedUsed: string;
  formattedDatabase: string;
  formattedBucket: string;
  quotaBytes: number;
  quotaMb: number;
  formattedQuota: string;
  freeBytes: number;
  formattedFree: string;
  usagePercentage: number;
  categories: StorageCategoryItem[];
  isQuotaAvailable: boolean;
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes <= 0 || isNaN(bytes) || !isFinite(bytes)) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

async function getFolderSize(bucketId: string, path = ''): Promise<{ size: number; count: number }> {
  if (!supabase) return { size: 0, count: 0 };

  let totalSize = 0;
  let totalCount = 0;

  try {
    const { data, error } = await supabase.storage.from(bucketId).list(path, { limit: 100 });
    if (error || !data) return { size: 0, count: 0 };

    for (const item of data) {
      if (item.id === null) {
        const subPath = path ? `${path}/${item.name}` : item.name;
        const sub = await getFolderSize(bucketId, subPath);
        totalSize += sub.size;
        totalCount += sub.count;
      } else {
        const rawSize = item.metadata?.size ?? (item as Record<string, any>).size ?? 0;
        const itemSize = typeof rawSize === 'number' ? rawSize : 0;
        totalSize += itemSize;
        totalCount += 1;
      }
    }
  } catch {
    // Fail gracefully on subfolder listing
  }

  return { size: totalSize, count: totalCount };
}

export async function fetchStorageMetrics(targetQuotaMb: number = 500): Promise<StorageMetrics> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase client is not configured or cloud connectivity is unavailable.');
  }

  const categories: StorageCategoryItem[] = [];
  let databaseBytes = 0;
  let bucketBytes = 0;
  let totalItemsCount = 0;

  // 1. Measure Cloud Database Tables usage
  const dbTables = [
    { key: 'students', label: 'Students Directory', desc: 'Student profile records, contact info & academic details' },
    { key: 'attendance_records', label: 'Attendance Records', desc: 'Historical attendance logs, timestamps & statuses' },
    { key: 'app_settings', label: 'Biometrics & System Data', desc: 'Face descriptors, fingerprint data, leave requests & settings' },
    { key: 'qr_sessions', label: 'QR Attendance Sessions', desc: 'Active & past QR code attendance sessions' },
  ];

  for (const table of dbTables) {
    try {
      const { data, error } = await supabase.from(table.key).select('*');
      if (!error && data) {
        const jsonStr = JSON.stringify(data);
        const bytes = new Blob([jsonStr]).size;
        databaseBytes += bytes;
        totalItemsCount += data.length;

        categories.push({
          id: `db-${table.key}`,
          name: table.label,
          type: 'database_table',
          itemCount: data.length,
          usedBytes: bytes,
          formattedSize: formatBytes(bytes),
          description: table.desc,
        });
      }
    } catch {
      // Ignore individual table failure
    }
  }

  // 2. Measure Supabase Storage Buckets usage
  let totalBuckets = 0;
  try {
    const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets();
    if (!bucketsErr && buckets && Array.isArray(buckets)) {
      totalBuckets = buckets.length;
      for (const b of buckets) {
        const { size, count } = await getFolderSize(b.id);
        bucketBytes += size;
        totalItemsCount += count;

        categories.push({
          id: `bucket-${b.id}`,
          name: `${b.name} (Storage Bucket)`,
          type: 'storage_bucket',
          itemCount: count,
          usedBytes: size,
          formattedSize: formatBytes(size),
          description: b.public ? 'Public storage bucket' : 'Private storage bucket',
        });
      }
    }
  } catch {
    // Ignore storage bucket list error if storage feature not enabled in instance
  }

  const totalUsedBytes = databaseBytes + bucketBytes;

  // Quota calculation (Default 500 MB Supabase Tier or configured target)
  const quotaMb = Math.max(1, targetQuotaMb);
  const quotaBytes = quotaMb * 1024 * 1024;
  const freeBytes = Math.max(0, quotaBytes - totalUsedBytes);
  const rawPercentage = (totalUsedBytes / quotaBytes) * 100;
  const usagePercentage = Math.min(100, Math.max(0, parseFloat(rawPercentage.toFixed(2))));

  return {
    totalBuckets,
    totalDatabaseTables: dbTables.length,
    totalItemsCount,
    usedBytes: totalUsedBytes,
    databaseBytes,
    bucketBytes,
    formattedUsed: formatBytes(totalUsedBytes),
    formattedDatabase: formatBytes(databaseBytes),
    formattedBucket: formatBytes(bucketBytes),
    quotaBytes,
    quotaMb,
    formattedQuota: formatBytes(quotaBytes),
    freeBytes,
    formattedFree: formatBytes(freeBytes),
    usagePercentage,
    categories,
    isQuotaAvailable: true,
  };
}
