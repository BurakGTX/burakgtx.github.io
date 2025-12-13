export default async function handler(req, res) {
  const USER_ID = 3380915154;

  try {
    // PROFİL
    const userRes = await fetch(
      `https://users.roblox.com/v1/users/${USER_ID}`
    );
    const user = await userRes.json();

    // ROBUX
    const robuxRes = await fetch(
      `https://economy.roblox.com/v1/users/${USER_ID}/currency`
    );
    const robux = await robuxRes.json();

    // GAME PASS
    let passes = [];
    let cursor = "";

    do {
      const invRes = await fetch(
        `https://inventory.roblox.com/v1/users/${USER_ID}/items/GamePass/34?limit=50&cursor=${cursor}`
      );
      const inv = await invRes.json();

      if (inv.data) passes.push(...inv.data);
      cursor = inv.nextPageCursor;
    } while (cursor);

    // CORS AÇ
    res.setHeader("Access-Control-Allow-Origin", "*");

    // JSON RESPONSE
    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        description: user.description,
        created: user.created
      },
      robux: robux.robux ?? 0,
      gamePassCount: passes.length,
      gamePasses: passes
    });

  } catch (err) {
    res.status(500).json({
      error: "Roblox API erişim hatası"
    });
  }
}
