"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogTitle,
    DialogClose,
    DialogPortal,
    DialogOverlay,
} from "@/components/ui/dialog";
import {
    Table,
    TableCaption,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";
import type { Entry as OriginalEntry } from "@/types/entry";
import type { Database } from "@/../supabase/database.types";
import type { Location } from "@/types/location";
import { Image as ImageIcon, Pencil, Trash2 } from "lucide-react";
import {
    ensureFloorsAndProfiles,
    getFloors,
    ensureLocations,
    getLocations,
} from "@/utils/localDataCache";
import { uploadPlantImage } from "@/utils/uploadPlantImage";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PlantSize } from "@/types/size";

// Typen
type Entry = OriginalEntry & { location_id: number; floor?: number };

export default function AddListForm() {
    const [editSize, setEditSize] = useState<PlantSize>("medium");
    const [showTable, setShowTable] = useState(false);
    const [plants, setPlants] = useState<Entry[]>([]);
    const [floors, setFloors] = useState<number[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editLocationId, setEditLocationId] = useState<number | null>(null);
    const [editFloor, setEditFloor] = useState<number | null>(null);

    useEffect(() => {
        async function initFloors() {
            await ensureFloorsAndProfiles();
            setFloors(getFloors());
        }
        initFloors();
    }, []);

    const handleOpen = async () => {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/plant");
        const json = await res.json();
        if (!res.ok) {
            setError(json.error || "Fehler beim Laden der Pflanzen.");
            setLoading(false);
            return;
        }
        const raw = json.data;
        if (raw) {
            const mapped: Entry[] = (raw as any[]).map((r) => ({
                id: r.id,
                name: r.name,
                locationName: r.location?.name ?? "Unbekannt",
                location_id: r.location_id,
                imageUrl: r.image_url ?? undefined,
                size: r.size ?? null,
                floor: r.location?.floor ?? null,
            }));
            setPlants(mapped);
        }
        setLoading(false);
        setShowTable(true);
    };

    const handleEdit = async (plant: Entry) => {
        setEditingId(plant.id);
        setEditLocationId(plant.location_id);
        setEditFloor(plant.floor ?? null);
        setEditSize((plant.size as PlantSize) ?? "medium");
        setFile(null);
        if (plant.floor != null) {
            await ensureLocations(plant.floor);
            setLocations(getLocations(plant.floor));
        } else {
            setLocations([]);
        }
    };

    async function updatePlant(
        id: number,
        location_id: number,
        size: PlantSize
    ) {
        const res1 = await fetch(`/api/plant-instance`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, location_id }),
        });
        if (!res1.ok) {
            const json = await res1.json();
            return { message: json.error || "Fehler beim Standort-Update" };
        }
        const res2 = await fetch(`/api/plant`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, size }),
        });
        if (!res2.ok) {
            const json = await res2.json();
            return { message: json.error || "Fehler beim Größen-Update" };
        }
        return null;
    }

    const handleDelete = async (id: number) => {
        const plant = plants.find((p) => p.id === id);
        if (!plant) return;
        if (
            !window.confirm(
                `Soll die Pflanze "${plant.name}" am Platz "${plant.locationName}" wirklich gelöscht werden?`
            )
        )
            return;
        try {
            const res = await fetch(`/api/plant-instance`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || "Unbekannter Fehler");
            }
            setPlants((prev) => prev.filter((p) => p.id !== id));
            toast.success(`Eintrag "${plant.name}" gelöscht.`);
            await handleOpen();
        } catch (err: any) {
            toast.error(
                `Fehler beim Löschen von "${plant.name}": ${err.message}`
            );
        }
    };

    const handlePlantImageLoading = (imageUrl?: string) => {
        if (!imageUrl)
            return toast.error("Für diese Pflanze ist kein Bild hinterlegt.");
        setLightboxUrl(imageUrl);
    };

    return (
        <>
            <Dialog
                open={showTable}
                onOpenChange={(open) => {
                    setShowTable(open);
                    if (!open) setEditingId(null);
                }}
            >
                <DialogTrigger asChild>
                    <Button
                        onClick={handleOpen}
                        className="cursor-pointer bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white dark:bg-emerald-600 dark:hover:bg-emerald-700"
                    >
                        Pflanzen auflisten
                    </Button>
                </DialogTrigger>
                <DialogContent className="!w-[90vw] !max-w-6xl">
                    <DialogTitle>Alle Pflanzen</DialogTitle>
                    {loading && <p>Lädt Pflanzen...</p>}
                    {error && (
                        <p className="text-destructive">Fehler: {error}</p>
                    )}
                    {!loading && !error && (
                        <Table>
                            <TableCaption>
                                Übersicht aller Pflanzen
                            </TableCaption>
                            {editingId === null && (
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Pflanzenart</TableHead>
                                        <TableHead>Standort</TableHead>
                                        <TableHead>Größe</TableHead>
                                        <TableHead>Bild</TableHead>
                                        <TableHead className="text-right">
                                            Bearbeiten
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Löschen
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                            )}
                            <TableBody>
                                {plants.map((e) =>
                                    editingId === e.id ? (
                                        <TableRow key={e.id}>
                                            <TableCell>{e.name}</TableCell>
                                            <TableCell colSpan={6}>
                                                <div className="max-w-5xl w-full">
                                                    <form
                                                        onSubmit={async (
                                                            ev
                                                        ) => {
                                                            ev.preventDefault();
                                                            if (
                                                                !editLocationId ||
                                                                !editFloor
                                                            ) {
                                                                toast.error(
                                                                    "Bitte wähle Stockwerk und Standort."
                                                                );
                                                                return;
                                                            }
                                                            const updateErr =
                                                                await updatePlant(
                                                                    e.id,
                                                                    editLocationId,
                                                                    editSize
                                                                );
                                                            if (updateErr)
                                                                return toast.error(
                                                                    "Fehler beim Aktualisieren: " +
                                                                        updateErr.message
                                                                );
                                                            if (file) {
                                                                try {
                                                                    await uploadPlantImage(
                                                                        file,
                                                                        e.id
                                                                    );
                                                                } catch (err: any) {
                                                                    return toast.error(
                                                                        "Upload fehlgeschlagen: " +
                                                                            err.message
                                                                    );
                                                                }
                                                            }
                                                            toast.success(
                                                                "Pflanze aktualisiert!"
                                                            );
                                                            setEditingId(null);
                                                            await handleOpen();
                                                        }}
                                                        className="flex flex-wrap items-start space-x-4"
                                                    >
                                                        <div className="flex flex-col space-y-1">
                                                            <Label
                                                                htmlFor="edit-floor"
                                                                className="text-sm font-medium"
                                                            >
                                                                Stockwerk
                                                            </Label>
                                                            <Select
                                                                value={
                                                                    editFloor?.toString() ??
                                                                    ""
                                                                }
                                                                onValueChange={async (
                                                                    v
                                                                ) => {
                                                                    const newFloor =
                                                                        Number(
                                                                            v
                                                                        );
                                                                    setEditFloor(
                                                                        newFloor
                                                                    );
                                                                    setEditLocationId(
                                                                        null
                                                                    );
                                                                    await ensureLocations(
                                                                        newFloor
                                                                    );
                                                                    setLocations(
                                                                        getLocations(
                                                                            newFloor
                                                                        )
                                                                    );
                                                                }}
                                                            >
                                                                <SelectTrigger
                                                                    id="edit-floor"
                                                                    className="w-12 cursor-pointer border text-gray-700 border-gray-300 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-800 rounded-md"
                                                                >
                                                                    <SelectValue placeholder="/" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {floors.map(
                                                                        (f) => (
                                                                            <SelectItem
                                                                                key={
                                                                                    f
                                                                                }
                                                                                value={f.toString()}
                                                                            >
                                                                                {
                                                                                    f
                                                                                }
                                                                            </SelectItem>
                                                                        )
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        <div className="flex flex-col space-y-1">
                                                            <Label
                                                                htmlFor="edit-location"
                                                                className="text-sm font-medium"
                                                            >
                                                                Standort
                                                            </Label>
                                                            <Select
                                                                value={
                                                                    editLocationId?.toString() ??
                                                                    ""
                                                                }
                                                                onValueChange={(
                                                                    v
                                                                ) =>
                                                                    setEditLocationId(
                                                                        Number(
                                                                            v
                                                                        )
                                                                    )
                                                                }
                                                                disabled={
                                                                    !editFloor
                                                                }
                                                            >
                                                                <SelectTrigger className="w-42 cursor-pointer border text-gray-700 border-gray-300 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-800 rounded-md">
                                                                    <SelectValue placeholder="Standort wählen" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {locations.map(
                                                                        (
                                                                            loc
                                                                        ) => (
                                                                            <SelectItem
                                                                                key={
                                                                                    loc.id
                                                                                }
                                                                                value={loc.id.toString()}
                                                                            >
                                                                                {
                                                                                    loc.name
                                                                                }
                                                                            </SelectItem>
                                                                        )
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        <div className="flex flex-col space-y-1">
                                                            <Label
                                                                htmlFor="edit-size"
                                                                className="text-sm font-medium"
                                                            >
                                                                Größe
                                                            </Label>
                                                            <Select
                                                                value={editSize}
                                                                onValueChange={(
                                                                    v
                                                                ) =>
                                                                    setEditSize(
                                                                        v as PlantSize
                                                                    )
                                                                }
                                                            >
                                                                <SelectTrigger className="w-48 cursor-pointer border text-gray-700 border-gray-300 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-800 rounded-md">
                                                                    <SelectValue placeholder="Größe wählen" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="small">
                                                                        Klein
                                                                    </SelectItem>
                                                                    <SelectItem value="medium">
                                                                        Mittel
                                                                    </SelectItem>
                                                                    <SelectItem value="large">
                                                                        Groß
                                                                    </SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        <div className="flex flex-col space-y-1">
                                                            <Label className="text-sm font-medium">
                                                                Neues Bild
                                                            </Label>
                                                            <Input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(
                                                                    ev
                                                                ) =>
                                                                    ev.target
                                                                        .files?.[0] &&
                                                                    setFile(
                                                                        ev
                                                                            .target
                                                                            .files[0]
                                                                    )
                                                                }
                                                                className="w-64 cursor-pointer border text-gray-700 border-gray-300 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-800 rounded-md"
                                                            />
                                                        </div>

                                                        <div className="flex space-x-4">
                                                            <Button
                                                                type="submit"
                                                                className="cursor-pointer border text-gray-700 border-gray-300 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-800 mt-6"
                                                            >
                                                                Speichern
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={() =>
                                                                    setEditingId(
                                                                        null
                                                                    )
                                                                }
                                                                className="cursor-pointer border text-gray-700 border-gray-300 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-800 mt-6"
                                                            >
                                                                Abbrechen
                                                            </Button>
                                                        </div>
                                                    </form>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        <TableRow key={e.id}>
                                            <TableCell>{e.name}</TableCell>
                                            <TableCell>
                                                {e.locationName}
                                            </TableCell>
                                            <TableCell>
                                                {e.size === "small"
                                                    ? "Klein"
                                                    : e.size === "large"
                                                    ? "Groß"
                                                    : "Mittel"}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    size="icon"
                                                    aria-label="Bild anzeigen"
                                                    className="cursor-pointer"
                                                    onClick={() =>
                                                        handlePlantImageLoading(
                                                            e.imageUrl
                                                        )
                                                    }
                                                >
                                                    <ImageIcon className="w-5 h-5 cursor-pointer" />
                                                </Button>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="icon"
                                                    aria-label="Bearbeiten"
                                                    className="cursor-pointer"
                                                    onClick={() =>
                                                        handleEdit(e)
                                                    }
                                                >
                                                    <Pencil className="w-5 h-5 cursor-pointer" />
                                                </Button>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="icon"
                                                    aria-label="Eintrag löschen"
                                                    className="cursor-pointer"
                                                    onClick={() =>
                                                        handleDelete(e.id)
                                                    }
                                                >
                                                    <Trash2 className="w-5 h-5 cursor-pointer" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                )}
                            </TableBody>
                        </Table>
                    )}
                    <DialogClose asChild>
                        <Button className="cursor-pointer mt-4 bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white dark:bg-emerald-600 dark:hover:bg-emerald-700">
                            Schließen
                        </Button>
                    </DialogClose>
                </DialogContent>
            </Dialog>

            {lightboxUrl && (
                <Dialog open onOpenChange={() => setLightboxUrl(null)}>
                    <DialogPortal>
                        <DialogOverlay className="fixed inset-0 bg-black/50 z-[1000]" />
                        <DialogContent className="max-w-[90vw] max-h-[90vh] p-4 z-[1001] [&>button:last-child]:hidden">
                            <DialogTitle className="sr-only">
                                Bildvorschau
                            </DialogTitle>
                            <img
                                src={lightboxUrl}
                                alt="Pflanzenbild"
                                className="w-full h-full object-contain"
                            />
                            <DialogClose asChild>
                                <Button className="absolute top-4 right-4 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-500 cursor-pointer">
                                    Schließen
                                </Button>
                            </DialogClose>
                        </DialogContent>
                    </DialogPortal>
                </Dialog>
            )}
        </>
    );
}
