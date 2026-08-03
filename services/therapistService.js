// services/therapistService.js
// Provides dynamic mock data for the Human Therapist Integration feature.

const MOCK_NAMES = ['Dr. Sarah Jenkins', 'Dr. Michael Chen', 'Dr. Priya Sharma', 'Dr. Emily Carter', 'Dr. James Wilson', 'Dr. Ayesha Khan'];
const SPECIALIZATIONS = ['Clinical Psychologist', 'Psychiatrist', 'Counselling Psychologist', 'Family Therapist'];
const CLINIC_NAMES = ['MindCare Clinic', 'Serenity Wellness Center', 'Hope Mental Health', 'Apex Psychiatry', 'Sunrise Counselling'];

// Helper to add random jitter to coordinates
const generateRandomCoordinatesAround = (lat, lng, radiusKm) => {
  // 1 degree of latitude is ~111km
  const radiusInDeg = radiusKm / 111;
  const u = Math.random();
  const v = Math.random();
  const w = radiusInDeg * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);
  
  // Adjust longitude jitter based on latitude
  const newLng = x / Math.cos(lat * (Math.PI / 180));
  return {
    latitude: lat + y,
    longitude: lng + newLng,
  };
};

export const getTherapistProfile = (id) => {
  // Generate a consistent dummy profile based on ID
  const numId = parseInt(id.replace(/[^0-9]/g, '')) || 1;
  const name = MOCK_NAMES[numId % MOCK_NAMES.length];
  
  return {
    id,
    name,
    photoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
    title: SPECIALIZATIONS[numId % SPECIALIZATIONS.length],
    experience: `${(numId % 15) + 3} Years`,
    languages: ['English', 'Hindi', 'Spanish'].slice(0, (numId % 3) + 1),
    price: `$${(numId % 5 + 8) * 10}/hr`,
    rating: (4.5 + (numId % 5) * 0.1).toFixed(1),
    reviews: (numId * 13) + 24,
    modes: ['Video', 'Voice', 'In-Person'],
    bio: `${name} is a highly experienced ${SPECIALIZATIONS[numId % SPECIALIZATIONS.length].toLowerCase()} specializing in cognitive behavioral therapy, anxiety management, and relationship counseling. Dedicated to creating a safe, non-judgmental space for profound healing.`,
    education: ['Ph.D. in Clinical Psychology, Stanford University', 'M.A. in Psychology, Harvard'],
    areasOfExpertise: ['Anxiety', 'Depression', 'Trauma', 'Stress Management'],
    availableSlots: [
      { date: 'Today', times: ['14:00', '15:30', '17:00'] },
      { date: 'Tomorrow', times: ['09:00', '11:00', '14:00'] },
    ]
  };
};

export const getNearbyProfessionals = (lat, lng, radiusKm = 10) => {
  const results = [];
  // Generate 15 dummy locations
  for (let i = 0; i < 15; i++) {
    const coords = generateRandomCoordinatesAround(lat, lng, radiusKm);
    const isClinic = i % 3 === 0;
    const name = isClinic ? CLINIC_NAMES[i % CLINIC_NAMES.length] : MOCK_NAMES[i % MOCK_NAMES.length];
    
    // Approximate distance Calculation (Haversine formula simplified for mock data)
    const distance = (Math.sqrt(Math.pow(lat - coords.latitude, 2) + Math.pow(lng - coords.longitude, 2)) * 111).toFixed(1);
    
    results.push({
      id: `professional-${i}`,
      name,
      type: isClinic ? 'Clinic' : SPECIALIZATIONS[i % SPECIALIZATIONS.length],
      coordinate: coords,
      distance: `${distance} km`,
      rating: (4.2 + (i % 8) * 0.1).toFixed(1),
      reviews: (i * 7) + 12,
      fee: isClinic ? 'Varies' : `$${(i % 5 + 8) * 10}/hr`,
      isOpen: i % 4 !== 0,
      photoUrl: isClinic 
        ? `https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80`
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      address: `${100 + i} Wellness Avenue, Suite ${i + 1}`,
      modes: ['In-person', 'Video']
    });
  }
  
  // Sort by distance
  return results.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
};

export const getGovernmentServices = () => {
  return [
    {
      id: 'gov-1',
      name: 'Tele-MANAS',
      description: 'National Tele Mental Health Programme providing 24/7 free support.',
      hours: '24/7 Available',
      phone: '14416',
      type: 'National Helpline'
    },
    {
      id: 'gov-2',
      name: 'Crisis Text Line',
      description: 'Free, 24/7, high-quality text-based mental health support.',
      hours: '24/7 Available',
      phone: '741741',
      type: 'Text Support'
    }
  ];
};

export const getSessionHistory = () => {
  return [
    {
      id: 'session-1',
      therapistId: 'professional-1',
      therapistName: 'Dr. Michael Chen',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      duration: '45 mins',
      type: 'Video Consultation',
      status: 'Completed',
    },
    {
      id: 'session-2',
      therapistId: 'professional-2',
      therapistName: 'Dr. Priya Sharma',
      date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      duration: '60 mins',
      type: 'In-Person',
      status: 'Completed',
    }
  ];
};
