import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");
    const type = searchParams.get("type");

    if (!name) {
        return NextResponse.json(
            { error: "Parameter 'name' fehlt oder ist ungültig." },
            { status: 400 }
        );
    }

    try {
        const apiKey = process.env.PERENUAL_API_KEY;

        if (type === "chosen") {
            const id = parseInt(name, 10);
            if (isNaN(id)) {
                return NextResponse.json(
                    { error: "Ungültige ID." },
                    { status: 400 }
                );
            }

            const detailsRes = await fetch(
                `https://perenual.com/api/v2/species/details/${id}?key=${apiKey}`
            );
            if (!detailsRes.ok) {
                console.error("Perenual-API details error:", detailsRes.status);
                return NextResponse.json(
                    { error: "Fehler von Perenual-API (details)." },
                    { status: 502 }
                );
            }

            const details = await detailsRes.json();

            const response = buildResponseFromDetails(details);
            return NextResponse.json(response, { status: 200 });
        }

        const listRes = await fetch(
            `https://perenual.com/api/v2/species-list?key=${apiKey}&q=${encodeURIComponent(
                name
            )}`
        );
        if (!listRes.ok) {
            console.error("Perenual-API list error:", listRes.status);
            return NextResponse.json(
                { error: "Fehler von Perenual-API (list)." },
                { status: 502 }
            );
        }
        const listJson = await listRes.json();
        const matches = listJson.data ?? [];

        const normalizedName = name.toLowerCase();

        let filtered = matches;
        if (type === "scientific") {
            filtered = matches.filter((item: any) =>
                item.scientific_name?.some((s: string) =>
                    s.toLowerCase().includes(normalizedName)
                )
            );
        } else if (type === "common") {
            filtered = matches.filter((item: any) =>
                item.common_name?.toLowerCase().includes(normalizedName)
            );
        }

        if (filtered.length === 0) {
            return NextResponse.json({ suggestions: [] }, { status: 200 });
        }

        if (filtered.length === 1) {
            const detailsRes = await fetch(
                `https://perenual.com/api/v2/species/details/${filtered[0].id}?key=${apiKey}`
            );
            if (!detailsRes.ok) {
                console.error("Perenual-API details error:", detailsRes.status);
                return NextResponse.json(
                    { error: "Fehler von Perenual-API (details)." },
                    { status: 502 }
                );
            }

            const details = await detailsRes.json();
            const response = buildResponseFromDetails(details);
            return NextResponse.json(response, { status: 200 });
        }

        const suggestions = filtered.map((item: any) => ({
            id: item.id,
            common_name: item.common_name,
            scientific_name: item.scientific_name,
        }));

        return NextResponse.json({ suggestions }, { status: 200 });
    } catch (err) {
        console.error("watering/route.ts Error:", err);
        return NextResponse.json(
            { error: "Fehler beim Kommunizieren mit Perenual-API." },
            { status: 502 }
        );
    }
}

function buildResponseFromDetails(details: any) {
    let interval_days = 2;
    const benchmark = details.watering_general_benchmark?.value;
    if (benchmark) {
        const nums = benchmark
            .toString()
            .split("-")
            .map((s: string) => parseFloat(s))
            .filter((n: number) => !isNaN(n));
        if (nums.length > 0) {
            interval_days =
                nums.reduce((a: number, b: number) => a + b, 0) / nums.length;
        }
    }

    const volMap: Record<string, number> = {
        frequent: 550,
        average: 300,
        minimum: 150,
        none: 50,
    };
    const wateringKey = details.watering?.toLowerCase() ?? "";
    const amount_ml = volMap[wateringKey] ?? 250;

    return { amount_ml, interval_days };
}
