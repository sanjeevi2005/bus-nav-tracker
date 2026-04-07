"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { useParams } from "next/navigation";

// Connect securely to Supabase using the hidden environment variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Tracker() {
  const params = useParams();
  const userId = params?.id; // Grabs the user ID directly from the website URL

  const [location, setLocation] = useState(null);
  const [isActive, setIsActive] = useState(true);
  
  // NEW: State to track if the GPS signal is lost
  const [isSignalLost, setIsSignalLost] = useState(false);

  // Load Google Maps securely
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  });

  useEffect(() => {
    if (!userId) return;

    const fetchLocation = async () => {
      const { data, error } = await supabase
        .from('sos_tracking')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        if (data.is_active) {
          setLocation({ lat: Number(data.latitude), lng: Number(data.longitude) });
          setIsActive(true);

          // NEW: Check if the signal is lost
          // We calculate the difference between NOW and the last time the phone updated the database
          const lastUpdateTime = new Date(data.updated_at).getTime();
          const timeSinceLastPing = Date.now() - lastUpdateTime;

          // If the phone hasn't updated the database in the last 15 seconds (15000 ms), signal is lost
          if (timeSinceLastPing > 15000) {
            setIsSignalLost(true);
          } else {
            setIsSignalLost(false);
          }

        } else {
          setIsActive(false); // User hit the "STOP SOS" button
          setIsSignalLost(false); // Reset signal lost state
        }
      }
    };

    // Fetch immediately, then update every 5 seconds
    fetchLocation();
    const interval = setInterval(fetchLocation, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  if (!isLoaded) return <div style={{ padding: 20 }}>Loading Map...</div>;
  if (!userId) return <div style={{ padding: 20 }}>Invalid Tracking Link.</div>;

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      
      {/* Floating Status Panel */}
      <div style={{ 
        position: "absolute", top: 20, left: 20, zIndex: 10, 
        background: "white", padding: "15px 25px", borderRadius: 10, 
        boxShadow: "0px 4px 10px rgba(0,0,0,0.2)",
        borderLeft: !isActive ? "5px solid #4caf50" : (isSignalLost ? "5px solid #ff9800" : "5px solid #d32f2f")
      }}>
        <h2 style={{ margin: "0 0 10px 0", color: "#333", fontFamily: "sans-serif" }}>
          🚨 SOS Tracker
        </h2>
        
        {/* Conditional Rendering for Status */}
        {isActive ? (
          isSignalLost ? (
            <p style={{ margin: 0, fontWeight: "bold", color: "#ff9800", fontFamily: "sans-serif" }}>
              ⚠️ GPS Signal Lost • Showing Last Known Location
            </p>
          ) : (
            <p style={{ margin: 0, fontWeight: "bold", color: "#d32f2f", fontFamily: "sans-serif", display: "flex", alignItems: "center" }}>
              <span style={{ height: 10, width: 10, backgroundColor: "#d32f2f", borderRadius: "50%", display: "inline-block", marginRight: 8, animation: "blink 1s infinite" }}></span>
              Tracking Active • Updating live...
            </p>
          )
        ) : (
          <p style={{ margin: 0, fontWeight: "bold", color: "#4caf50", fontFamily: "sans-serif" }}>
            ✓ User is Safe. Tracking Stopped.
          </p>
        )}
      </div>
      
      {/* The Google Map */}
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={location || { lat: 20, lng: 0 }}
        zoom={location ? 16 : 2}
        options={{ disableDefaultUI: true, zoomControl: true }}
      >
        {location && (
          <Marker 
            position={location} 
            // Optional: You could fade the marker slightly if the signal is lost
            options={{ opacity: isSignalLost ? 0.6 : 1 }} 
          />
        )}
      </GoogleMap>

      {/* Quick CSS for the blinking red dot */}
      <style>{`
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0.3; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}