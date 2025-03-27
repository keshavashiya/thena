const DB_VERSION = 1;
const DB_NAME = 'flightBookingDB';

const STORE = {
  FLIGHTS: 'flights',
  SEARCHES: 'searches',
  BOOKINGS: 'bookings'
};

export async function initDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE.FLIGHTS)) {
        const flightsStore = db.createObjectStore(STORE.FLIGHTS, { keyPath: 'id' });
        flightsStore.createIndex('departureAirport', 'departure_airport', { unique: false });
        flightsStore.createIndex('arrivalAirport', 'arrival_airport', { unique: false });
        flightsStore.createIndex('departureTime', 'departure_time', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE.SEARCHES)) {
        const searchesStore = db.createObjectStore(STORE.SEARCHES, { keyPath: 'id', autoIncrement: true });
        searchesStore.createIndex('timestamp', 'timestamp', { unique: false });
        searchesStore.createIndex('query', 'query', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE.BOOKINGS)) {
        const bookingsStore = db.createObjectStore(STORE.BOOKINGS, { keyPath: 'id' });
        bookingsStore.createIndex('userId', 'user_id', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onerror = (event) => {
      reject(`IndexedDB error: ${(event.target as IDBOpenDBRequest).error}`);
    };
  });
}

export async function storeFlightSearchResults(searchQuery: any, flights: any[]): Promise<void> {
  try {
    const db = await initDatabase();
    const transaction = db.transaction([STORE.FLIGHTS, STORE.SEARCHES], 'readwrite');

    const flightsStore = transaction.objectStore(STORE.FLIGHTS);
    for (const flight of flights) {
      flightsStore.put(flight);
    }

    const searchesStore = transaction.objectStore(STORE.SEARCHES);
    searchesStore.add({
      query: searchQuery,
      results: flights.map(f => f.id),
      timestamp: new Date().toISOString(),
      count: flights.length
    });

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = (event) => reject((event.target as IDBTransaction).error);
    });
  } catch (error) {
    console.error('Error storing flight search results:', error);
    throw error;
  }
}

export async function getCachedFlightSearchResults(searchQuery: any): Promise<any[] | null> {
  try {
    const db = await initDatabase();
    const transaction = db.transaction([STORE.SEARCHES, STORE.FLIGHTS], 'readonly');

    const searchesStore = transaction.objectStore(STORE.SEARCHES);
    const searchesCursor = searchesStore.index('timestamp').openCursor(null, 'prev');

    return new Promise((resolve, reject) => {
      searchesCursor.onsuccess = async (event) => {
        const cursor = (event.target as IDBRequest).result;

        if (cursor) {
          const search = cursor.value;

          const isMatch = isMatchingSearch(search.query, searchQuery);

          if (isMatch) {
            try {
              const flights = await getFlightsByIds(search.results);
              resolve(flights);
            } catch (err) {
              reject(err);
            }
            return;
          }

          cursor.continue();
        } else {
          resolve(null);
        }
      };

      searchesCursor.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error('Error retrieving cached flight search results:', error);
    return null;
  }
}

function isMatchingSearch(cachedQuery: any, currentQuery: any): boolean {
  return (
    cachedQuery.origin === currentQuery.origin &&
    cachedQuery.destination === currentQuery.destination &&
    cachedQuery.departureDate === currentQuery.departureDate &&
    cachedQuery.cabinClass === currentQuery.cabinClass
  );
}

async function getFlightsByIds(flightIds: string[]): Promise<any[]> {
  try {
    const db = await initDatabase();
    const transaction = db.transaction(STORE.FLIGHTS, 'readonly');
    const flightsStore = transaction.objectStore(STORE.FLIGHTS);

    const promises = flightIds.map(id => {
      return new Promise((resolve, reject) => {
        const request = flightsStore.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });

    return Promise.all(promises);
  } catch (error) {
    console.error('Error getting flights by IDs:', error);
    throw error;
  }
}
