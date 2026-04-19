require('dotenv').config();
const express = require('express');
const { TwitterApi } = require('twitter-api-v2');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const MY_ID = "1675863612064186368";

// Initialize Client inside a check
let client;
if (process.env.X_BEARER_TOKEN) {
    client = new TwitterApi(process.env.X_BEARER_TOKEN);
}

app.get('/', (req, res) => res.send('CREAO_BRIDGE_ONLINE'));

app.get('/targets', async (req, res) => {
    const { mode } = req.query;
    
    if (!client) return res.status(500).json({ error: "X_BEARER_TOKEN is missing in Railway Variables" });

    try {
        console.log(`Searching for: ${mode}`);
        const following = await client.v2.following(MY_ID, { "user.fields": "public_metrics" });
        
        if (!following.data) return res.json({ count: 0, users: [], message: "No following found" });

        if (mode === 'betrayal') {
            const followers = await client.v2.followers(MY_ID);
            const followerIds = new Set(followers.data?.map(f => f.id) || []);
            const targets = following.data.filter(u => !followerIds.has(u.id));
            return res.json({ count: targets.length, users: targets });
        }

        if (mode === 'inactive') {
            const targets = [];
            const sixDaysAgo = new Date();
            sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

            // Checking first 15 for safety/speed
            for (const user of following.data.slice(0, 15)) {
                const timeline = await client.v2.userTimeline(user.id, { max_results: 5, "tweet.fields": "created_at" });
                const lastTweet = timeline.data?.[0]?.created_at;

                if (!lastTweet || new Date(lastTweet) < sixDaysAgo) {
                    targets.push({ username: user.username, last_tweet: lastTweet || 'Never' });
                }
            }
            return res.json({ count: targets.length, users: targets });
        }

        res.status(400).json({ error: "Use mode=inactive or mode=betrayal" });
    } catch (error) {
        console.error("X API Error:", error);
        res.status(500).json({ error: error.message, detail: "Check if your Bearer Token has 'Following' permissions enabled" });
    }
});

app.post('/log-unfollow', (req, res) => {
    console.log("Unfollow Logged:", req.body);
    res.json({ status: "success" });
});

const PORT = process.env.PORT || 8080;

// Listen on [::] to support both IPv4 (0.0.0.0) and IPv6
app.listen(PORT, '::', () => {
    console.log(`🚀 BRIDGE IS OFFICIALLY LIVE`);
    console.log(`Listening on Port: ${PORT} (IPv4 + IPv6)`);
});
