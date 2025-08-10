import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/utils/supabaseAdmin";
import { plantImageSchema } from "@/utils/plantValidation";
import { Buffer } from "buffer";

export const config = {
    api: { bodyParser: false },
};

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const plantIdRaw = formData.get("plantId");
        const imageFile = formData.get("image");

        console.log("[plant-image] Processing upload request:", {
            plantIdRaw,
            hasFile: !!imageFile,
        });

        const plantIdNum =
            typeof plantIdRaw === "string" ? Number(plantIdRaw) : NaN;
        const parsed = plantImageSchema.safeParse({ plantId: plantIdNum });
        if (!parsed.success) {
            console.error("[plant-image] Invalid plantId:", plantIdRaw);
            return NextResponse.json(
                { error: "Ungültige Pflanzen-ID" },
                { status: 400 }
            );
        }
        const { plantId } = parsed.data;

        if (!imageFile || !(imageFile instanceof Blob)) {
            console.error("[plant-image] No valid image file received");
            return NextResponse.json(
                { error: "Keine gültige Bilddatei empfangen" },
                { status: 400 }
            );
        }

        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const originalFilename =
            (imageFile as File).name || `upload-${Date.now()}`;

        const fileName = `plants/${plantId}_${Date.now()}_${originalFilename}`;
        const { data: uploadData, error: uploadError } =
            await supabaseAdmin.storage
                .from("bachelor-baseplant-jacob-flender-bucket")
                .upload(fileName, buffer, {
                    upsert: true,
                    contentType: imageFile.type,
                });

        if (uploadError) {
            console.error("[plant-image] Upload error:", uploadError);
            return NextResponse.json(
                { error: "Fehler beim Hochladen: " + uploadError.message },
                { status: 500 }
            );
        }

        if (!uploadData?.path) {
            console.error("[plant-image] No upload path received");
            return NextResponse.json(
                { error: "Keine Upload-Pfad erhalten" },
                { status: 500 }
            );
        }

        const { data: urlData } = supabaseAdmin.storage
            .from("bachelor-baseplant-jacob-flender-bucket")
            .getPublicUrl(uploadData.path);

        if (!urlData?.publicUrl) {
            console.error("[plant-image] No public URL received");
            return NextResponse.json(
                { error: "Konnte keine öffentliche URL generieren" },
                { status: 500 }
            );
        }

        if (plantId < 0 || plantId > 1000000000) {
            return NextResponse.json({
                success: true,
                imageUrl: urlData.publicUrl,
            });
        }

        const { error: dbError } = await supabaseAdmin
            .schema("bachelor_baseplant_jacob_flender")
            .from("Plant")
            .update({ image_url: urlData.publicUrl })
            .eq("id", plantId);

        if (dbError) {
            console.error("[plant-image] Database update error:", dbError);

            return NextResponse.json({
                success: true,
                imageUrl: urlData.publicUrl,
                warning:
                    "Bild hochgeladen, aber Datenbank-Update fehlgeschlagen: " +
                    dbError.message,
            });
        }

        return NextResponse.json({
            success: true,
            imageUrl: urlData.publicUrl,
        });
    } catch (error: any) {
        console.error("[plant-image] Unexpected error:", error);
        return NextResponse.json(
            { error: "Server-Fehler: " + (error.message || String(error)) },
            { status: 500 }
        );
    }
}
