"use client";

import { useState } from 'react';
import FlightSearch from '@/components/FlightSearch';
import FlightList from '@/components/FlightList';
import BookingForm from '@/components/BookingForm';
import { Flight, Passenger } from '@/types';
import { supabase } from '@/lib/supabase';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [searchResults, setSearchResults] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passengerCount, setPassengerCount] = useState({ adults: 1, children: 0, infants: 0 });

  const handleSearchResults = (flights: Flight[], searchParams: any) => {
    setSearchResults(flights);
    setSelectedFlight(null);
    setShowBookingForm(false);

    if (searchParams?.passengers) {
      setPassengerCount({
        adults: searchParams.passengers.adults || 1,
        children: searchParams.passengers.children || 0,
        infants: searchParams.passengers.infants || 0
      });
    }
  };

  const handleSelectFlight = (flight: Flight) => {
    console.log('Selected flight:', flight);
    setSelectedFlight(flight);
    setShowBookingForm(true);
  };

  const handleBookingSubmit = async (passengers: Passenger[]) => {
    if (!selectedFlight || !session?.user?.id) {
      setError("You must be logged in to book a flight");
      return;
    }

    if (passengers.length === 0) {
      setError("No passenger information provided");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: authData } = await supabase.auth.getSession();

      if (!authData.session) {
        setError("Your session has expired. Please sign in again.");
        router.push('/auth');
        return;
      }

      console.log('Creating booking for:', selectedFlight.flight_number);
      console.log('Number of passengers:', passengers.length);

      const totalAmount = Math.max(parseFloat((selectedFlight.price * passengers.length).toFixed(2)), 0.01);
      console.log('Total amount:', totalAmount);

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: session.user.id,
          flight_id: selectedFlight.id,
          total_amount: totalAmount,
          cabin_class: selectedFlight.cabin_class || 'economy',
          status: 'confirmed',
        })
        .select()
        .single();

      if (bookingError) {
        console.error('Booking creation error:', bookingError);
        throw bookingError;
      }

      if (!booking || !booking.id) {
        throw new Error('Failed to create booking: No booking ID returned');
      }

      console.log('Booking created successfully:', booking.id);
      console.log('Adding passengers:', passengers.length);

      const { error: passengersError } = await supabase
        .from('passengers')
        .insert(
          passengers.map((passenger) => ({
            booking_id: booking.id,
            first_name: passenger.first_name,
            last_name: passenger.last_name,
            date_of_birth: passenger.date_of_birth,
            passport_number: passenger.passport_number || null,
            email: passenger.email || session.user?.email || '',
            phone: passenger.phone || null,
          }))
        );

      if (passengersError) {
        console.error('Adding passengers error:', passengersError);
        throw passengersError;
      }

      console.log('Passengers added successfully');

      const { generateETicket } = await import('@/lib/ticket');

      try {
        const ticketResult = await generateETicket(booking, passengers, selectedFlight);
        console.log('E-ticket generated:', ticketResult.ticketUrl);
      } catch (utilError) {
        console.error('Error with ticket:', utilError);
      }

      setShowBookingForm(false);
      setSelectedFlight(null);
      setSearchResults([]);

      alert('Booking confirmed! Check your bookings page for details.');

      router.push('/bookings');

    } catch (err) {
      console.error('Booking error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-center mb-8">Flight Booking System</h1>

        {!showBookingForm ? (
          <>
            <FlightSearch onSearchResults={handleSearchResults} />
            <div className="mt-8">
              <FlightList
                flights={searchResults}
                onSelectFlight={handleSelectFlight}
                loading={loading}
              />
            </div>
          </>
        ) : (
          <BookingForm
            flight={selectedFlight!}
            passengerCount={passengerCount.adults + passengerCount.children}
            onSubmit={handleBookingSubmit}
            onCancel={() => setShowBookingForm(false)}
          />
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
