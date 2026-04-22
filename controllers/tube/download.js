const API_BASE_URL = "https://meu8.vercel.app/m3u8/";

async function downloadMedia(v) {
    const requestData = {
        resolution: v.resolution,
        format: v.format || "m3u8",
        url: v.url
    };

    if (!requestData.url) {
        console.error("エラー: URLが指定されていません。");
        return null;
    }

    try {
        console.log(`リクエスト送信中: ${requestData.url} [${requestData.resolution}]`);

        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 必要に応じて認証ヘッダーなどをここに追加
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`APIリクエストが失敗しました (Status: ${response.status})`);
        }

        const result = await response.json();
        console.log("取得成功:", result);
        return result;

    } catch (error) {
        console.error("download.js内で例外が発生しました:", error.message);
        throw error;
    }
}

const videoData = {
    resolution: "1080p",
    format: "m3u8",
    url: "https://example.com/video/stream.m3u8"
};

downloadMedia(videoData)
    .then(data => console.log("処理完了"))
    .catch(err => console.error("処理失敗"));
export default downloadMedia;
