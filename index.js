require('dotenv').config();
const express = require('express');
const { TwitterApi } = require('twitter-api-v2');

const app = express();
app.use(express.json());

// Initialize X Client
const client = new TwitterApi(process.env.X_BEARER_TOKEN);
const MY_ID = "1675863612064186368";

// Mode A: Inactive (6 Days)
// Mode B: Betrayal (Not following back)
app.get('/targets', async (req, res) => {
    const { mode } = req.query;
    console.log(`Querying targets for mode: ${mode}`);

    try {
        // Fetch users you follow (limit to 100 per request for performance)
        const following = await client.v2.following(MY_ID, { "user.fields": "public_metrics" });
        const followingList = following.data;

        if (mode === 'betrayal') {
            const followers = await client.v2.followers(MY_ID);
            const followerIds = new Set(followers.data.map(f => f.id));
            const nonBackers = followingList.filter(u => !followerIds.has(u.id));
            return res.json({ count: nonBackers.length, users: nonBackers });
        } 

        if (mode === 'inactive') {
            const inactiveUsers = [];
            const sixDaysAgo = new Date();
            sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

            // Checking timelines is heavy. We process the first 25 to avoid timeouts.
            for (const user of followingList.slice(0, 25)) {
                const timeline = await client.v2.userTimeline(user.id, { 
                    max_results: 5, 
                    "tweet.fields": "created_at" 
                });
                
                const lastTweet = timeline.data?.[0]?.created_at;
                if (!lastTweet || new Date(lastTweet) < sixDaysAgo) {
                    inactiveUsers.push({
                        username: user.username,
                        id: user.id,
                        last_tweet: lastTweet || "Never"
                    });
                }
            }
            return res.json({ count: inactiveUsers.length, users: inactiveUsers });
        }

        res.status(400).json({ error: "Invalid mode. Use 'inactive' or 'betrayal'." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint for CREAO to log the action after it's done
let unfollowLog = [];
app.post('/log-unfollow', (req, res) => {
    const { username, id, reason } = req.body;
    const entry = {
        username,
        id,
        reason,
        timestamp: new Date().toISOString()
    };
    unfollowLog.push(entry);
    console.log(`[LOGGED] Unfollowed ${username} for: ${reason}`);
    res.json({ status: "success", entry });
});

// View history
app.get('/history', (req, res) => res.json(unfollowLog));

const PORT = process.env.PORT || 3000;

// IMPORTANT: Listen on '0.0.0.0' so Railway can route traffic to the app
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running and listening on port ${PORT}`);
});
