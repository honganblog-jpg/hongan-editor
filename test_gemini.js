const fetch = require('node-fetch') || fetch; // Node 18+ has built in fetch
const API_KEY = 'AIzaSyAUgS3qmVH5dT8l0NovrpYiit8HlTK090c';

async function test() {
    const payload = {
        contents: [{
            parts: [
                { text: "Test prompt" },
                {
                    inlineData: {
                        mimeType: "image/jpeg",
                        // a tiny tiny valid base64 image (1x1 pixel black)
                        data: "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
                    }
                }
            ]
        }]
    };

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            console.error("ERROR Response:", JSON.stringify(err, null, 2));
        } else {
            console.log("SUCCESS");
            const data = await res.json();
            console.log(data.candidates[0].content.parts[0].text);
        }
    } catch (e) {
        console.error("Network Error:", e);
    }
}
test();
