export default async function handler(req, res) {
    const { usd } = req.query;

    if (!usd || isNaN(usd)) {
        return res.status(400).json({
            error: "Geçerli bir USD miktarı gir"
        });
    }

    try {
        const response = await fetch(
            "https://free.ratesdb.com/v1/rates?from=USD&to=TRY"
        );
        const data = await response.json();

        const rate = data.data.rates.TRY;
        const result = usd * rate;

        res.status(200).json({
            usd: Number(usd),
            try: Number(result.toFixed(2)),
            rate: rate,
            date: data.data.date
        });

    } catch (err) {
        res.status(500).json({
            error: "Kur bilgisi alınamadı"
        });
    }
}
