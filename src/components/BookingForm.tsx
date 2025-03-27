'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Flight, Passenger } from '@/types';

const passengerSchema = z.object({
  first_name: z.string().min(2, 'First name is required'),
  last_name: z.string().min(2, 'Last name is required'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  passport_number: z.string().optional(),
  email: z.string().email('Invalid email').optional(),
  phone: z.string().optional(),
});

type PassengerFormData = z.infer<typeof passengerSchema>;

interface BookingFormProps {
  flight: Flight;
  passengerCount: number;
  onSubmit: (passengers: Passenger[]) => void;
  onCancel: () => void;
}

export default function BookingForm({ flight, passengerCount, onSubmit, onCancel }: BookingFormProps) {
  const [currentPassenger, setCurrentPassenger] = useState(1);
  const [passengers, setPassengers] = useState<PassengerFormData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PassengerFormData>({
    resolver: zodResolver(passengerSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      date_of_birth: '',
      passport_number: '',
      email: '',
      phone: '',
    }
  });

  const onPassengerSubmit = (data: PassengerFormData) => {
    const updatedPassengers = [...passengers, data];
    setPassengers(updatedPassengers);
    reset();
    setError(null);

    if (currentPassenger < passengerCount) {
      setCurrentPassenger(currentPassenger + 1);
    } else {
      handleFinalSubmit(updatedPassengers);
    }
  };

  const handleFinalSubmit = async (finalPassengers: PassengerFormData[]) => {
    if (finalPassengers.length === 0) {
      setError("No passenger information provided");
      return;
    }

    setLoading(true);
    try {
      const passengersData = finalPassengers.map(p => ({
        first_name: p.first_name,
        last_name: p.last_name,
        date_of_birth: p.date_of_birth,
        passport_number: p.passport_number || null,
        email: p.email || null,
        phone: p.phone || null,
      })) as Passenger[];

      console.log('Submitting passengers:', passengersData);
      onSubmit(passengersData);
    } catch (err) {
      console.error('Error submitting passengers:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold mb-6">Passenger Information</h2>

      <div className="mb-4 flex items-center">
        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
          Flight: {flight.flight_number}
        </div>
        <div className="ml-4 text-gray-600">
          {flight.departure_airport_details?.iata_code || flight.departure_airport} →{" "}
          {flight.arrival_airport_details?.iata_code || flight.arrival_airport}
        </div>
        <div className="ml-auto font-medium">
          Price: ${Number(flight.price).toFixed(2)}
        </div>
      </div>

      <div className="mb-6">
        <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
          <p className="text-gray-700 mb-1">
            <span className="font-medium">Total passengers:</span> {passengerCount}
          </p>
          <p className="text-gray-700">
            <span className="font-medium">Currently entering:</span> Passenger {currentPassenger} of {passengerCount}
          </p>
          {passengers.length > 0 && (
            <div className="mt-2 pt-2 border-t border-blue-100">
              <p className="text-sm font-medium">Passengers entered:</p>
              <ul className="text-sm text-gray-600 mt-1">
                {passengers.map((p, index) => (
                  <li key={index}>
                    {index + 1}. {p.first_name} {p.last_name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onPassengerSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">First Name</label>
            <input
              type="text"
              {...register('first_name')}
              className="mt-1 p-4 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.first_name && (
              <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Last Name</label>
            <input
              type="text"
              {...register('last_name')}
              className="mt-1 p-4 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.last_name && (
              <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
          <input
            type="date"
            {...register('date_of_birth')}
            className="mt-1 p-4 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.date_of_birth && (
            <p className="mt-1 text-sm text-red-600">{errors.date_of_birth.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Passport Number (Optional)</label>
            <input
              type="text"
              {...register('passport_number')}
              className="mt-1 p-4 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.passport_number && (
              <p className="mt-1 text-sm text-red-600">{errors.passport_number.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              {...register('email')}
              className="mt-1 p-4 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Phone Number (Optional)</label>
          <input
            type="tel"
            {...register('phone')}
            className="mt-1 p-4 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Processing...' : currentPassenger === passengerCount ? 'Complete Booking' : 'Next Passenger'}
          </button>
        </div>
      </form>
    </div>
  );
}