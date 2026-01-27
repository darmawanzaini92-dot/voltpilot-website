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
        // Configure arcs for route lines
        .arcsData([])
        .arcStartLat('startLat')
        .arcStartLng('startLng')
        .arcEndLat('endLat')
        .arcEndLng('endLng')
        .arcColor(d => d.visible ? ['#F86A28', '#FFD700'] : ['rgba(248,106,40,0.2)', 'rgba(255,215,0,0.2)'])
        .arcAltitude(0.15)
        .arcStroke(0.5)
        .arcDashLength(0.4)
        .arcDashGap(0.2)
        .arcDashAnimateTime(2000)
        .arcLabel(d => `Route ${d.index}<br>From: ${d.startLat.toFixed(2)}, ${d.startLng.toFixed(2)}<br>To: ${d.endLat.toFixed(2)}, ${d.endLng.toFixed(2)}`)
        // Configure points for origins without destinations
        .pointsData([])
        .pointLat('lat')
        .pointLng('lng')
        .pointAltitude(0)
        .pointRadius(0.4)
        .pointColor(d => d.visible ? '#F86A28' : 'rgba(248,106,40,0.2)')
        .pointLabel(d => `Route Origin ${d.index}<br>Lat: ${d.lat.toFixed(4)}, Lng: ${d.lng.toFixed(4)}`)
        (globeContainer);

    // Set initial view
    globe.pointOfView({ lat: 20, lng: 100, altitude: 1.5 });

    // Very slow auto-rotation
    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.1;
    controls.enableZoom = true;

    // Track arcs data, points data, and blink interval
    let arcsData = [];
    let pointsData = [];
    let blinkInterval = null;
    let blinkTimeout = null;

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
                .limit(20)
                .get();

            // Update total count display
            document.getElementById('coordinates-info').innerHTML =
                `<span class="text-brand-primary text-lg font-semibold">Total routes planned with VoltPilot: </span><span class="text-white text-xl font-bold">${totalCount.toLocaleString()}</span>`;

            if (!snapshot.empty) {
                // Clear previous blink interval and timeout
                if (blinkInterval) {
                    clearInterval(blinkInterval);
                    blinkInterval = null;
                }
                if (blinkTimeout) {
                    clearTimeout(blinkTimeout);
                    blinkTimeout = null;
                }

                // Reset data arrays
                arcsData = [];
                pointsData = [];

                // Process each route document
                snapshot.docs.forEach((doc, index) => {
                    const data = doc.data();
                    const startLat = parseFloat(data.origin_lat);
                    const startLng = parseFloat(data.origin_long);
                    const endLat = parseFloat(data.destination_lat);
                    const endLng = parseFloat(data.destination_long);

                    // Check if origin coordinates are valid
                    const hasValidOrigin = !isNaN(startLat) && !isNaN(startLng);
                    // Check if destination coordinates are valid
                    const hasValidDestination = !isNaN(endLat) && !isNaN(endLng);

                    if (hasValidOrigin && hasValidDestination) {
                        // Full route with destination - show as arc
                        arcsData.push({
                            startLat,
                            startLng,
                            endLat,
                            endLng,
                            index: index + 1,
                            visible: true
                        });
                    } else if (hasValidOrigin) {
                        // Only origin available - show as blinking point
                        pointsData.push({
                            lat: startLat,
                            lng: startLng,
                            index: index + 1,
                            visible: true
                        });
                    } else {
                        console.warn(`Invalid coordinates for route ${index + 1}:`, data);
                    }
                });

                // Update globe with arcs and points
                globe.arcsData(arcsData);
                globe.pointsData(pointsData);

                // Blinking animation - toggle visibility every 1.5 seconds for 65 seconds
                blinkInterval = setInterval(() => {
                    arcsData.forEach(arc => {
                        arc.visible = !arc.visible;
                    });
                    pointsData.forEach(point => {
                        point.visible = !point.visible;
                    });
                    globe.arcsData([...arcsData]);
                    globe.pointsData([...pointsData]);
                }, 1500);

                // Stop blinking after 65 seconds
                blinkTimeout = setTimeout(() => {
                    if (blinkInterval) {
                        clearInterval(blinkInterval);
                        blinkInterval = null;
                    }
                    // Keep all visible (not blinking) after timeout
                    arcsData.forEach(arc => {
                        arc.visible = true;
                    });
                    pointsData.forEach(point => {
                        point.visible = true;
                    });
                    globe.arcsData([...arcsData]);
                    globe.pointsData([...pointsData]);
                }, 65000);

                // Focus on the latest route
                const latestData = snapshot.docs[0].data();
                const originLat = parseFloat(latestData.origin_lat);
                const originLng = parseFloat(latestData.origin_long);
                const destLat = parseFloat(latestData.destination_lat);
                const destLng = parseFloat(latestData.destination_long);

                // Use midpoint if destination exists, otherwise use origin
                let focusLat = originLat;
                let focusLng = originLng;
                if (!isNaN(destLat) && !isNaN(destLng)) {
                    focusLat = (originLat + destLat) / 2;
                    focusLng = (originLng + destLng) / 2;
                }

                globe.pointOfView({
                    lat: !isNaN(focusLat) ? focusLat : 20,
                    lng: !isNaN(focusLng) ? focusLng : 100,
                    altitude: 1.5
                }, 1500);

                // Update last update time
                const now = new Date();
                document.getElementById('last-update').textContent =
                    `Last updated: ${now.toLocaleTimeString()}`;

                console.log('Route events fetched:', arcsData.length, 'arcs,', pointsData.length, 'points, Total:', totalCount);
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
