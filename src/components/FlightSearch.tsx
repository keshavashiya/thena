"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { Airport, Flight } from "@/types";
import { useDebounce } from "@/hooks/useDebounce";

const searchSchema = z.object({
  origin: z.string().min(3, "Please select origin"),
  destination: z.string().min(3, "Please select destination"),
  departureDate: z.string().min(1, "Please select departure date"),
  returnDate: z.string().optional(),
  passengers: z.object({
    adults: z.number().min(1, "At least 1 adult required"),
    children: z.number().min(0, "Cannot be negative"),
    infants: z.number().min(0, "Cannot be negative"),
  }),
  cabinClass: z.enum(["economy", "business", "first"]),
  isRoundTrip: z.boolean(),
});

type SearchFormData = z.infer<typeof searchSchema>;

interface FlightSearchProps {
  onSearchResults: (flights: Flight[], searchParams: SearchFormData) => void;
}

export default function FlightSearch({ onSearchResults }: FlightSearchProps) {
  const [originSearch, setOriginSearch] = useState("");
  const [destinationSearch, setDestinationSearch] = useState("");
  const [originAirports, setOriginAirports] = useState<Airport[]>([]);
  const [destinationAirports, setDestinationAirports] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);

  const debouncedOriginSearch = useDebounce(originSearch, 300);
  const debouncedDestinationSearch = useDebounce(destinationSearch, 300);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      passengers: {
        adults: 1,
        children: 0,
        infants: 0,
      },
      cabinClass: "economy",
      isRoundTrip: false,
    },
  });

  const isRoundTrip = watch("isRoundTrip");

  useEffect(() => {
    async function searchAirports() {
      if (debouncedOriginSearch.length < 2) {
        setOriginAirports([]);
        setShowOriginDropdown(false);
        return;
      }

      try {
        if (debouncedOriginSearch.includes(" - ")) {
          return;
        }

        const { data, error } = await supabase
          .from("airports")
          .select("*")
          .or(
            `iata_code.ilike.${debouncedOriginSearch}%,name.ilike.%${debouncedOriginSearch}%,city.ilike.%${debouncedOriginSearch}%`
          )
          .limit(5);

        if (error) throw error;
        setOriginAirports(data || []);
        setShowOriginDropdown(data && data.length > 0);
      } catch (error) {
        console.error("Error searching airports:", error);
      }
    }

    searchAirports();
  }, [debouncedOriginSearch]);

  useEffect(() => {
    async function searchAirports() {
      if (debouncedDestinationSearch.length < 2) {
        setDestinationAirports([]);
        setShowDestinationDropdown(false);
        return;
      }

      try {
        if (debouncedDestinationSearch.includes(" - ")) {
          return;
        }

        const { data, error } = await supabase
          .from("airports")
          .select("*")
          .or(
            `iata_code.ilike.${debouncedDestinationSearch}%,name.ilike.%${debouncedDestinationSearch}%,city.ilike.%${debouncedDestinationSearch}%`
          )
          .limit(5);

        if (error) throw error;
        setDestinationAirports(data || []);
        setShowDestinationDropdown(data && data.length > 0);
      } catch (error) {
        console.error("Error searching airports:", error);
      }
    }

    searchAirports();
  }, [debouncedDestinationSearch]);

  const handleSelectOriginAirport = (airport: Airport) => {
    const formattedValue = `${airport.iata_code} - ${airport.city}, ${airport.name}`;
    setValue("origin", airport.iata_code);
    setOriginSearch(formattedValue);
    setShowOriginDropdown(false);
    setOriginAirports([]);
  };

  const handleSelectDestinationAirport = (airport: Airport) => {
    const formattedValue = `${airport.iata_code} - ${airport.city}, ${airport.name}`;
    setValue("destination", airport.iata_code);
    setDestinationSearch(formattedValue);
    setShowDestinationDropdown(false);
    setDestinationAirports([]);
  };

  const onSubmit = async (data: SearchFormData) => {
    setLoading(true);
    setError(null);

    try {
      let flightsWithAirports: Flight[] = [];
      let fromCache = false;

      if (typeof window !== "undefined") {
        try {
          const { getCachedFlightSearchResults } = await import(
            "@/lib/indexedDB"
          );

          const cachedFlights = await getCachedFlightSearchResults(data);

          if (cachedFlights && cachedFlights.length > 0) {
            flightsWithAirports = cachedFlights;
            fromCache = true;
            console.log("Using cached flight results");
          }
        } catch (cacheError) {
          console.error("Error accessing cache:", cacheError);
        }
      }

      if (!fromCache) {
        const { data: originAirport, error: originError } = await supabase
          .from("airports")
          .select("id")
          .eq("iata_code", data.origin.toUpperCase())
          .single();

        if (originError)
          throw new Error(`Origin airport not found: ${data.origin}`);

        const { data: destinationAirport, error: destError } = await supabase
          .from("airports")
          .select("id")
          .eq("iata_code", data.destination.toUpperCase())
          .single();

        if (destError)
          throw new Error(`Destination airport not found: ${data.destination}`);

        const { data: flights, error } = await supabase
          .from("flights")
          .select("*")
          .eq("departure_airport", originAirport.id)
          .eq("arrival_airport", destinationAirport.id)
          .gte("departure_time", new Date(data.departureDate).toISOString())
          .lt(
            "departure_time",
            new Date(
              new Date(data.departureDate).setDate(
                new Date(data.departureDate).getDate() + 1
              )
            ).toISOString()
          );

        if (error) throw error;

        flightsWithAirports = await Promise.all(
          (flights || []).map(async (flight) => {
            const { data: departureAirport } = await supabase
              .from("airports")
              .select("*")
              .eq("id", flight.departure_airport)
              .single();

            const { data: arrivalAirport } = await supabase
              .from("airports")
              .select("*")
              .eq("id", flight.arrival_airport)
              .single();

            return {
              ...flight,
              departure_airport_details: departureAirport,
              arrival_airport_details: arrivalAirport,
              cabin_class: data.cabinClass,
            };
          })
        );

        if (typeof window !== "undefined" && flightsWithAirports.length > 0) {
          try {
            const { storeFlightSearchResults } = await import(
              "@/lib/indexedDB"
            );
            await storeFlightSearchResults(data, flightsWithAirports);
            console.log("Stored flight results in cache");
          } catch (storageError) {
            console.error("Error storing in cache:", storageError);
          }
        }
      }

      onSearchResults(flightsWithAirports || [], data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              {...register("isRoundTrip")}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <span>Round Trip</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700">
              From
            </label>
            <input
              type="text"
              value={originSearch}
              onChange={(e) => {
                const value = e.target.value;
                setOriginSearch(value);
                if (!value.includes(" - ")) {
                  setValue("origin", value);
                }
              }}
              onFocus={() => {
                if (originAirports.length > 0) {
                  setShowOriginDropdown(true);
                }
              }}
              onBlur={() => {
                setTimeout(() => setShowOriginDropdown(false), 200);
              }}
              className="p-4 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Search airport or city"
            />
            <input type="hidden" {...register("origin")} />
            {errors.origin && (
              <p className="mt-1 text-sm text-red-600">
                {errors.origin.message}
              </p>
            )}

            {showOriginDropdown && originAirports.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-60 overflow-auto">
                <ul className="py-1">
                  {originAirports.map((airport) => (
                    <li
                      key={airport.id}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectOriginAirport(airport);
                      }}
                    >
                      <div className="font-medium">
                        {airport.iata_code} - {airport.city}
                      </div>
                      <div className="text-sm text-gray-500">
                        {airport.name}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700">
              To
            </label>
            <input
              type="text"
              value={destinationSearch}
              onChange={(e) => {
                const value = e.target.value;
                setDestinationSearch(value);
                if (!value.includes(" - ")) {
                  setValue("destination", value);
                }
              }}
              onFocus={() => {
                if (destinationAirports.length > 0) {
                  setShowDestinationDropdown(true);
                }
              }}
              onBlur={() => {
                setTimeout(() => setShowDestinationDropdown(false), 200);
              }}
              className="p-4 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Search airport or city"
            />
            <input type="hidden" {...register("destination")} />
            {errors.destination && (
              <p className="mt-1 text-sm text-red-600">
                {errors.destination.message}
              </p>
            )}

            {showDestinationDropdown && destinationAirports.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-60 overflow-auto">
                <ul className="py-1">
                  {destinationAirports.map((airport) => (
                    <li
                      key={airport.id}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectDestinationAirport(airport);
                      }}
                    >
                      <div className="font-medium">
                        {airport.iata_code} - {airport.city}
                      </div>
                      <div className="text-sm text-gray-500">
                        {airport.name}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Departure Date
            </label>
            <input
              type="date"
              {...register("departureDate")}
              className="p-4 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.departureDate && (
              <p className="mt-1 text-sm text-red-600">
                {errors.departureDate.message}
              </p>
            )}
          </div>

          {isRoundTrip && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Return Date
              </label>
              <input
                type="date"
                {...register("returnDate")}
                className="p-4 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.returnDate && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.returnDate.message}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Adults
            </label>
            <input
              type="number"
              {...register("passengers.adults", { valueAsNumber: true })}
              className="p-4 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              min="1"
            />
            {errors.passengers?.adults && (
              <p className="mt-1 text-sm text-red-600">
                {errors.passengers.adults.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Children
            </label>
            <input
              type="number"
              {...register("passengers.children", { valueAsNumber: true })}
              className="p-4 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              min="0"
            />
            {errors.passengers?.children && (
              <p className="mt-1 text-sm text-red-600">
                {errors.passengers.children.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Infants
            </label>
            <input
              type="number"
              {...register("passengers.infants", { valueAsNumber: true })}
              className="p-4 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              min="0"
            />
            {errors.passengers?.infants && (
              <p className="mt-1 text-sm text-red-600">
                {errors.passengers.infants.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Cabin Class
          </label>
          <select
            {...register("cabinClass")}
            className="p-4 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="economy">Economy</option>
            <option value="business">Business</option>
            <option value="first">First Class</option>
          </select>
          {errors.cabinClass && (
            <p className="mt-1 text-sm text-red-600">
              {errors.cabinClass.message}
            </p>
          )}
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search Flights"}
        </button>
      </form>
    </div>
  );
}
