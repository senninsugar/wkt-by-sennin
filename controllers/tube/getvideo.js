const express = require("express");
const router = express.Router();
const axios = require("axios");
const ytService = require("../../server/youtube.js"); 
const videoEngine = require("../../server/wakame.js");

const SERVERS = {
    invidious: { name: 'Standard', url: 'https://invidious.example.com' },
    siawaseok: { name: 'Premium Cache', url: 'https://siawaseok.f5.si', type: 'json' },
    yudlp:     { name: 'Fast Stream', url: 'https://yudlp.vercel.app', type: 'array' }
};

router.get('/:id', async (req, res) => {
    const videoId = req.params.id;
    const mode = req.cookies.playbackMode || 'normal';

    if (['edu', 'nocookie'].includes(mode)) {
        return res.redirect(`/wkt/yt/${mode}/${videoId}`);
    }

    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return res.status(400).send('Invalid Video ID');
    }

    const requestedServer = req.query.server;
    let finalServer = requestedServer || 'invidious';
    let systemNotice = null;

    try {
        if (!requestedServer) {
            const bestServer = await findBestCacheServer(videoId);
            if (bestServer) {
                finalServer = bestServer;
                systemNotice = `最適化サーバー「${bestServer}」を自動選択しました。`;
            }
        }

        const [videoStream, rawInfo] = await Promise.all([
            videoEngine.getYouTube(videoId, finalServer),
            ytService.infoGet(videoId)
        ]);

        const videoInfo = normalizeVideoData(rawInfo);

        res.render('tube/watch.ejs', { 
            videoData: videoStream, 
            videoInfo, 
            videoId, 
            baseUrl: finalServer, 
            systemNotice 
        });

    } catch (error) {
        console.error(`Render Error [${videoId}]:`, error.message);
        
        const fallbackList = Object.keys(SERVERS).sort(() => Math.random() - 0.5);
        res.status(500).render('tube/error_retry.ejs', { 
            videoId, 
            error: '動画の読み込みに失敗しました。',
            suggestedServers: fallbackList
        });
    }
});

async function findBestCacheServer(videoId) {
    const check = async (id, serverKey) => {
        const config = SERVERS[serverKey];
        const res = await axios.get(`${config.url}/api/cache`, { timeout: 1500 });
        
        if (config.type === 'array') return res.data.video.includes(id) ? serverKey : null;
        return res.data[id] ? serverKey : null;
    };

    const targets = ['siawaseok', 'yudlp'];
    for (const key of targets) {
        try {
            const result = await check(videoId, key);
            if (result) return result;
        } catch (e) {
            continue;
        }
    }
    return null;
}

function normalizeVideoData(info) {
    return {
        title: info.primary_info?.title?.text || "不明なタイトル",
        channel: {
            id: info.secondary_info?.owner?.author?.id,
            name: info.secondary_info?.owner?.author?.name,
            icon: info.secondary_info?.owner?.author?.thumbnails?.[0]?.url
        },
        stats: {
            views: info.primary_info?.view_count?.short_view_count?.text || "0 views",
            published: info.primary_info?.published
        },
        description: info.secondary_info?.description?.text || "",
        recommendations: ytService.normalizeWatchNextFeed(info.watch_next_feed)
    };
}

module.exports = router;
