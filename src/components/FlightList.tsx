import { Flight } from '@/types';
import { format } from 'date-fns';

interface FlightListProps {
  flights: Flight[];
  onSelectFlight: (flight: Flight) => void;
  loading?: boolean;
}

export default function FlightList({ flights, onSelectFlight, loading = false }: FlightListProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (flights.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No flights found for your search criteria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {flights.map((flight) => (
        <div
          key={flight.id}
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="flex items-center space-x-4">
                <h3 className="text-xl font-semibold">{flight.airline}</h3>
                <span className="text-gray-600">Flight {flight.flight_number}</span>
              </div>
              <div className="flex items-center space-x-4 text-gray-600">
                <div>
                  <div className="font-medium">
                    {format(new Date(flight.departure_time), 'HH:mm')}
                  </div>
                  <div className="text-sm">
                    {flight.departure_airport_details?.iata_code || flight.departure_airport}
                  </div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-sm text-gray-500">
                    {getDuration(flight.departure_time, flight.arrival_time)}
                  </div>
                  <div className="border-t border-gray-300 w-full mt-1"></div>
                </div>
                <div>
                  <div className="font-medium">
                    {format(new Date(flight.arrival_time), 'HH:mm')}
                  </div>
                  <div className="text-sm">
                    {flight.arrival_airport_details?.iata_code || flight.arrival_airport}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>
                  {flight.cabin_class ? flight.cabin_class.replace('_', ' ') : 'Economy'}
                </span>
                <span>•</span>
                <span>{flight.available_seats} seats available</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                ${Number(flight.price).toFixed(2)}
              </div>
              <button
                onClick={() => onSelectFlight(flight)}
                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Select Flight
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function getDuration(departureTime: string, arrivalTime: string): string {
  const departure = new Date(departureTime);
  const arrival = new Date(arrivalTime);
  const durationMs = arrival.getTime() - departure.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}