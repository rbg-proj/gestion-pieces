import { openDB } from 'idb';

export const initOfflineDB = async () => {
  return openDB('bolt-offline-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('offline_sales')) {
        db.createObjectStore('offline_sales', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
};
