// Firebase configuration from environment variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize 3D Globe
    const globeContainer = document.getElementById('globe-container');

    const globe = Globe()
        .width(globeContainer.clientWidth)
        .height(500)
        .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
        .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
        .pointsData([])
        .pointLat('lat')
        .pointLng('lng')
        .pointAltitude(0)
        .pointRadius(0.3)
        .pointColor(d => d.visible ? '#F86A28' : 'rgba(248,106,40,0.3)')
        .pointLabel(d => `Route Origin ${d.index}<br>Lat: ${d.lat.toFixed(4)}, Lng: ${d.lng.toFixed(4)}`)
        (globeContainer);

    // Set initial view
    globe.pointOfView({ lat: 20, lng: 100, altitude: 0.8 });

    // Very slow auto-rotation
    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.1;
    controls.enableZoom = true;

    // Track points data and blink interval
    let pointsData = [];
    let blinkInterval = null;

    // Get total count of all route_planned_events
    async function getTotalRouteCount() {
        try {
            const snapshot = await db.collection('route_planned_events').get();
            return snapshot.size;
        } catch (error) {
            console.error('Error getting count:', error);
            return 0;
        }
    }

    // Fetch latest 10 route_planned_events from Firestore
    async function fetchLatestRouteEvents() {
        try {
            // Get total count
            const totalCount = await getTotalRouteCount();

            const snapshot = await db.collection('route_planned_events')
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();

            // Update total count display
            document.getElementById('coordinates-info').innerHTML =
                `<span class="text-brand-primary text-lg font-semibold">Total routes planned with VoltPilot: </span><span class="text-white text-xl font-bold">${totalCount.toLocaleString()}</span>`;

            if (!snapshot.empty) {
                // Clear previous blink interval
                if (blinkInterval) {
                    clearInterval(blinkInterval);
                }

                // Create points data for pins
                pointsData = snapshot.docs.map((doc, index) => {
                    const data = doc.data();
                    return {
                        lat: data.origin_lat,
                        lng: data.origin_long,
                        index: index + 1,
                        visible: true
                    };
                });

                // Update globe with points
                globe.pointsData(pointsData);

                // Slow continuous blinking - toggle visibility every 1.5 seconds
                blinkInterval = setInterval(() => {
                    pointsData.forEach(point => {
                        point.visible = !point.visible;
                    });
                    globe.pointsData([...pointsData]); // Force re-render
                }, 1500);

                // Focus on the latest pin
                const latestData = snapshot.docs[0].data();
                globe.pointOfView({
                    lat: latestData.origin_lat,
                    lng: latestData.origin_long,
                    altitude: 0.8
                }, 1500);

                // Update last update time
                const now = new Date();
                document.getElementById('last-update').textContent =
                    `Last updated: ${now.toLocaleTimeString()}`;

                console.log('Route events fetched:', snapshot.docs.length, 'Total:', totalCount);
            }
        } catch (error) {
            console.error('Error fetching route events:', error);
            document.getElementById('coordinates-info').innerHTML =
                '<span class="text-red-400">Error loading route data</span>';
        }
    }

    // Initial fetch
    fetchLatestRouteEvents();

    // Refresh every 60 seconds
    setInterval(fetchLatestRouteEvents, 60000);

    // Handle window resize
    window.addEventListener('resize', () => {
        globe.width(globeContainer.clientWidth);
    });
});
