import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, push } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBaRX-2KiwawrKwk6NV8vA0iCRqKrDYEes",
  authDomain: "pretzl-pulse.firebaseapp.com",
  databaseURL: "https://pretzl-pulse-default-rtdb.firebaseio.com",
  projectId: "pretzl-pulse",
  storageBucket: "pretzl-pulse.firebasestorage.app",
  messagingSenderId: "919756348582",
  appId: "1:919756348582:web:1973283ab72f8f52bea867",
  measurementId: "G-H9KJ3EB4HP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Pretzl brand assets
const PRETZL_WORDMARK = '/wordmark_offwhite.svg';
const PRETZL_ORB = '/orb_offwhite.png';

// Pretzl brand colors
const BRAND = {
  red: '#FF0000',
  blue: '#0000FF', 
  yellow: '#DFFF00',
};

function Gauge({ label, value, color, description }) {
  const percentage = (value / 10) * 100;
  const rotation = (percentage / 100) * 180 - 90;
  
  const getStatusColor = (val) => {
    if (val >= 7) return '#22c55e';
    if (val >= 4) return '#eab308';
    return '#ef4444';
  };
  
  const statusColor = value > 0 ? getStatusColor(value) : '#374151';
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-28 overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-24">
          <svg viewBox="0 0 200 100" className="w-full h-full">
            {/* Background arc */}
            <path
              d="M 10 100 A 90 90 0 0 1 190 100"
              fill="none"
              stroke="#1f2937"
              strokeWidth="16"
              strokeLinecap="round"
            />
            {/* Colored arc based on value */}
            <path
              d="M 10 100 A 90 90 0 0 1 190 100"
              fill="none"
              stroke={statusColor}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={`${percentage * 2.83} 283`}
              style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.5s ease' }}
            />
            {/* Tick marks */}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((tick) => {
              const angle = (tick / 10) * 180 - 180;
              const rad = (angle * Math.PI) / 180;
              const x1 = 100 + 75 * Math.cos(rad);
              const y1 = 100 + 75 * Math.sin(rad);
              const x2 = 100 + 85 * Math.cos(rad);
              const y2 = 100 + 85 * Math.sin(rad);
              return (
                <line
                  key={tick}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#4b5563"
                  strokeWidth="2"
                />
              );
            })}
          </svg>
          {/* Needle */}
          <div
            className="absolute bottom-0 left-1/2 origin-bottom"
            style={{
              transform: `translateX(-50%) rotate(${rotation}deg)`,
              transition: 'transform 0.5s ease',
            }}
          >
            <div className="w-1 h-16 bg-white rounded-full shadow-lg" />
            <div className="w-3 h-3 bg-white rounded-full absolute -bottom-1 left-1/2 -translate-x-1/2" />
          </div>
        </div>
      </div>
      {/* Value display */}
      <div className="text-4xl font-bold text-white mt-2">
        {value > 0 ? value.toFixed(1) : '—'}
      </div>
      <div className="text-lg font-semibold mt-1" style={{ color }}>
        {label}
      </div>
      <div className="text-xs text-gray-400 text-center mt-1 max-w-32">
        {description}
      </div>
    </div>
  );
}

function RatingSlider({ label, value, onChange, color }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium" style={{ color }}>{label}</span>
        <span className="text-lg font-bold text-white">{value}</span>
      </div>
      <input
        type="range"
        min="1"
        max="10"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        style={{ accentColor: color }}
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  );
}

export default function FeedbackMeter() {
  const [responses, setResponses] = useState([]);
  const [lastReset, setLastReset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [ratings, setRatings] = useState({ clarity: 5, capacity: 5, connection: 5 });

  useEffect(() => {
    // Listen for real-time updates from Firebase
    const responsesRef = ref(database, 'responses');
    const metaRef = ref(database, 'meta');

    const unsubResponses = onValue(responsesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const responseList = Object.values(data);
        setResponses(responseList);
      } else {
        setResponses([]);
      }
      setLoading(false);
    });

    const unsubMeta = onValue(metaRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.lastReset) {
        setLastReset(data.lastReset);
      }
    });

    return () => {
      unsubResponses();
      unsubMeta();
    };
  }, []);

  const calculateAverages = () => {
    if (responses.length === 0) {
      return { clarity: 0, capacity: 0, connection: 0, count: 0 };
    }
    const sum = responses.reduce(
      (acc, r) => ({
        clarity: acc.clarity + r.clarity,
        capacity: acc.capacity + r.capacity,
        connection: acc.connection + r.connection,
      }),
      { clarity: 0, capacity: 0, connection: 0 }
    );
    const count = responses.length;
    return {
      clarity: sum.clarity / count,
      capacity: sum.capacity / count,
      connection: sum.connection / count,
      count,
    };
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const newResponse = {
      ...ratings,
      timestamp: new Date().toISOString(),
    };
    try {
      const responsesRef = ref(database, 'responses');
      await push(responsesRef, newResponse);
      setShowForm(false);
      setRatings({ clarity: 5, capacity: 5, connection: 5 });
    } catch (e) {
      console.error('Failed to save:', e);
    }
    setSubmitting(false);
  };

  const handleReset = async () => {
    if (window.confirm('Reset all feedback? This cannot be undone.')) {
      try {
        await set(ref(database, 'responses'), null);
        await set(ref(database, 'meta'), { lastReset: new Date().toISOString() });
      } catch (e) {
        console.error('Failed to reset:', e);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const averages = calculateAverages();

  return (
    <div className="min-h-screen bg-gray-900 p-6 relative overflow-hidden">
      {/* Brand color bar at top */}
      <div className="absolute top-0 left-0 right-0 h-1.5 flex">
        <div className="flex-grow" style={{ backgroundColor: BRAND.red }} />
        <div className="w-20" style={{ backgroundColor: BRAND.blue }} />
        <div className="w-32" style={{ backgroundColor: BRAND.yellow }} />
      </div>
      
      {/* Background orb watermark */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `url(${PRETZL_ORB})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }}
      />
      
      <div className="max-w-4xl mx-auto relative z-10 pt-4">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src={PRETZL_WORDMARK} 
            alt="Pretzl" 
            className="h-6 mx-auto mb-4 opacity-70"
          />
          <h1 className="text-3xl font-bold text-white mb-2">Mood-O-Meter</h1>
          <p className="text-gray-400">Thought Leadership Team</p>
        </div>

        {/* Gauges */}
        <div className="bg-gray-800 rounded-2xl p-8 mb-6">
          <div className="flex justify-around flex-wrap gap-8">
            <Gauge
              label="Clarity"
              value={averages.clarity}
              color={BRAND.red}
              description="Do I know what I'm doing and why?"
            />
            <Gauge
              label="Capacity"
              value={averages.capacity}
              color={BRAND.blue}
              description="Do I have room to do it well?"
            />
            <Gauge
              label="Connection"
              value={averages.connection}
              color={BRAND.yellow}
              description="Do I feel plugged into the team?"
            />
          </div>
          
          {/* Response count */}
          <div className="text-center mt-8 pt-6 border-t border-gray-700">
            <span className="text-gray-400">
              {averages.count} responses
            </span>
            {lastReset && (
              <span className="text-gray-500 text-sm ml-4">
                Last reset: {new Date(lastReset).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {!showForm ? (
          <div className="flex gap-4 justify-center flex-wrap">
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Submit My Feedback
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
            >
              Reset
            </button>
          </div>
        ) : (
          /* Feedback form */
          <div className="bg-gray-800 rounded-2xl p-8">
            <h2 className="text-xl font-semibold text-white mb-6">How are you feeling?</h2>
            <div className="space-y-8">
              <RatingSlider
                label="Clarity — Do I know what I'm doing and why?"
                value={ratings.clarity}
                onChange={(v) => setRatings({ ...ratings, clarity: v })}
                color={BRAND.red}
              />
              <RatingSlider
                label="Capacity — Do I have room to do it well?"
                value={ratings.capacity}
                onChange={(v) => setRatings({ ...ratings, capacity: v })}
                color={BRAND.blue}
              />
              <RatingSlider
                label="Connection — Do I feel plugged into the team?"
                value={ratings.connection}
                onChange={(v) => setRatings({ ...ratings, connection: v })}
                color={BRAND.yellow}
              />
            </div>
            <div className="flex gap-4 mt-8">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        
        {/* Footer */}
        <div className="text-center mt-8 text-gray-600 text-xs">
          © Pretzl Group 2025
        </div>
      </div>
    </div>
  );
}
