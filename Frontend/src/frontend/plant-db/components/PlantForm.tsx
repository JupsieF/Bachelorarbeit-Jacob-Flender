"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useFloorsAndProfiles } from "@/hooks/fetchFloorsAndProfiles";
import { useLocations } from "@/hooks/fetchLocations";
import { usePlantDetails } from "@/hooks/fetchFloorsAndProfiles";
import { useResetPlantForm } from "@/hooks/useResetPlantForm";
import type { Suggestion } from "@/types/suggestion";
import type { TablesInsert } from "@/../supabase/database.types";
import { uploadPlantImage } from "@/utils/uploadPlantImage";
import * as minMaxValues from "@/utils/sharedValues";
import { PlantSize } from "@/types/size";

export default function AddPlantForm() {
    type Mode = "existing" | "new";

    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<Mode>("existing");
    const [selectedProfileName, setSelectedProfileName] = useState<string>();
    const [selectedFloor, setSelectedFloor] = useState<number>();
    const [selectedLocationId, setSelectedLocationId] = useState<number>();
    const [newName, setNewName] = useState("");
    const [newMethod, setNewMethod] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [size, setSize] = useState<PlantSize>("medium");
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [chosenId, setChosenId] = useState<number | null>(null);

    const {
        loading: loadingFetch,
        error: fetchError,
        interval: newInterval,
        volume: newVolume,
        setInterval: setNewInterval,
        setVolume: setNewVolume,
        setError: setFetchError,
    } = usePlantDetails(chosenId);

    const { floors, careProfiles, loadingProfiles } = useFloorsAndProfiles();
    const locations = useLocations(selectedFloor);

    useResetPlantForm({
        newName,
        setSuggestions,
        setChosenId,
        setFetchError,
        setNewInterval,
        setNewVolume,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedLocationId) {
            toast.error("Bitte wähle einen Standort aus.");
            return;
        }

        let careId: number;
        let plantName: string;

        try {
            // Mode "new" - Neue Pflanzenart anlegen
            if (mode === "new") {
                if (!newName?.trim()) {
                    toast.error("Bitte gib einen Namen ein.");
                    return;
                }
                if (careProfiles.some((c) => c.name === newName)) {
                    toast.error("Diese Pflanzenart existiert bereits.");
                    return;
                }
                if (!newMethod) {
                    toast.error("Bitte wähle eine Gießmethode.");
                    return;
                }
                if (
                    !newInterval ||
                    newInterval < minMaxValues.minInterval ||
                    newInterval > minMaxValues.maxInterval
                ) {
                    toast.error(
                        `Intervall muss zwischen ${minMaxValues.minInterval} und ${minMaxValues.maxInterval} Tagen liegen.`
                    );
                    return;
                }
                if (
                    !newVolume ||
                    newVolume < minMaxValues.minVolume ||
                    newVolume > minMaxValues.maxVolume
                ) {
                    toast.error(
                        `Menge muss zwischen ${minMaxValues.minVolume} und ${minMaxValues.maxVolume} ml liegen.`
                    );
                    return;
                }

                let uploadedImageUrl: string | null = null;
                if (file) {
                    try {
                        const tempId = Date.now();
                        uploadedImageUrl = await uploadPlantImage(file, tempId);
                    } catch (err: any) {
                        console.error("Upload-Fehler:", err);
                        toast.error(
                            "Bild-Upload fehlgeschlagen: " + err.message
                        );
                        return;
                    }
                }

                const plantData = {
                    name: newName.trim(),
                    location_id: selectedLocationId,
                    size,
                    method: newMethod.trim(),
                    interval: newInterval,
                    volume: newVolume,
                    image_url: uploadedImageUrl,
                };

                const res = await fetch("/api/plant", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(plantData),
                });

                const json = await res.json();
                if (!res.ok || !json.data || !json.data[0]) {
                    toast.error(
                        json.error || "Fehler beim Anlegen der Pflanze."
                    );
                    return;
                }

                const createdId = json.data[0].id;

                if (uploadedImageUrl) {
                    try {
                        const imageRes = await fetch(
                            `/api/plant-image-update`,
                            {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    id: json.data[0].id,
                                    image_url: uploadedImageUrl,
                                }),
                            }
                        );

                        if (!imageRes.ok) {
                            const imageJson = await imageRes.json();
                            console.error(
                                "Fehler beim Zuweisen des Bildes:",
                                imageJson.error
                            );
                            toast.error(
                                "Bild konnte nicht zugewiesen werden: " +
                                    imageJson.error
                            );
                        }
                    } catch (err: any) {
                        console.error("Fehler beim Zuweisen des Bildes:", err);
                        toast.error(
                            "Bild konnte nicht zugewiesen werden: " +
                                err.message
                        );
                    }
                }

                try {
                    const wateringRes = await fetch("/api/watering-task", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            plant_id: createdId,
                            interval: newInterval,
                            method: newMethod,
                        }),
                    });

                    if (!wateringRes.ok) {
                        const wateringJson = await wateringRes.json();
                        console.error(
                            "Fehler beim Anlegen der Gießaufgabe:",
                            wateringJson.error
                        );
                        toast.error(
                            "Pflanze wurde angelegt, aber die Gießaufgabe konnte nicht erstellt werden."
                        );
                    }
                } catch (err: any) {
                    console.error("Fehler beim Anlegen der Gießaufgabe:", err);
                    toast.error(
                        "Pflanze wurde angelegt, aber die Gießaufgabe konnte nicht erstellt werden."
                    );
                }

                toast.success("Pflanze und neue Art erfolgreich angelegt.");
            } else {
                // Mode "existing" - Bestehende Pflanzenart verwenden
                if (!selectedProfileName) {
                    toast.error("Bitte wähle eine bestehende Art aus.");
                    return;
                }

                const found = careProfiles.find(
                    (c) => c.name === selectedProfileName
                );
                if (!found) {
                    toast.error("Ausgewählte Art wurde nicht gefunden.");
                    return;
                }

                careId = found.id;
                plantName = found.name!;

                let uploadedImageUrl: string | null = null;
                if (file) {
                    try {
                        const tempId = Date.now();
                        uploadedImageUrl = await uploadPlantImage(file, tempId);
                    } catch (err: any) {
                        console.error("Upload-Fehler:", err);
                        toast.error(
                            "Bild-Upload fehlgeschlagen: " + err.message
                        );
                        return;
                    }
                }

                const plantInstanceData: TablesInsert<"Plant"> = {
                    name: plantName,
                    location_id: selectedLocationId,
                    care_id: careId,
                    size,
                    image_url: uploadedImageUrl,
                };

                const resPlant = await fetch("/api/plant-instance", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(plantInstanceData),
                });

                const plantJson = await resPlant.json();
                if (!resPlant.ok || !plantJson.data || !plantJson.data[0]) {
                    toast.error(
                        plantJson.error || "Fehler beim Anlegen der Pflanze."
                    );
                    return;
                }

                if (uploadedImageUrl) {
                    try {
                        const imageRes = await fetch(
                            `/api/plant-image-update`,
                            {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    id: plantJson.data[0].id,
                                    image_url: uploadedImageUrl,
                                }),
                            }
                        );

                        if (!imageRes.ok) {
                            const imageJson = await imageRes.json();
                            console.error(
                                "Fehler beim Zuweisen des Bildes:",
                                imageJson.error
                            );
                            toast.error(
                                "Bild konnte nicht zugewiesen werden: " +
                                    imageJson.error
                            );
                        }
                    } catch (err: any) {
                        console.error("Fehler beim Zuweisen des Bildes:", err);
                        toast.error(
                            "Bild konnte nicht zugewiesen werden: " +
                                err.message
                        );
                    }
                }

                const careProfile = careProfiles.find((p) => p.id === careId);
                if (careProfile) {
                    try {
                        const wateringRes = await fetch("/api/watering-task", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                plant_id: plantJson.data[0].id,
                                interval: careProfile.interval,
                                method: careProfile.method,
                            }),
                        });

                        if (!wateringRes.ok) {
                            const wateringJson = await wateringRes.json();
                            console.error(
                                "Fehler beim Anlegen der Gießaufgabe:",
                                wateringJson.error
                            );
                            toast.error(
                                "Pflanze wurde angelegt, aber die Gießaufgabe konnte nicht erstellt werden."
                            );
                        }
                    } catch (err: any) {
                        console.error(
                            "Fehler beim Anlegen der Gießaufgabe:",
                            err
                        );
                        toast.error(
                            "Pflanze wurde angelegt, aber die Gießaufgabe konnte nicht erstellt werden."
                        );
                    }
                }

                toast.success(`Die Art "${plantName}" wurde angelegt.`);
            }

            // Reset Form
            setIsOpen(false);
            setMode("existing");
            setSelectedProfileName(undefined);
            setNewName("");
            setNewMethod("");
            setNewInterval(undefined);
            setNewVolume(undefined);
            setSelectedFloor(undefined);
            setSelectedLocationId(undefined);
            setFile(null);
        } catch (error: any) {
            console.error("Fehler:", error);
            toast.error(
                "Ein unerwarteter Fehler ist aufgetreten: " + error.message
            );
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button className="cursor-pointer bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white dark:bg-emerald-600 dark:hover:bg-emerald-700">
                        Neue Pflanze
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Neue Pflanze</DialogTitle>
                        <DialogDescription>
                            Wähle eine bestehende Art oder lege eine neue an.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                        {/* Art-Auswahl existing vs new */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label>Neue oder vorhandene Pflanze</Label>
                            <div className="col-span-3 flex items-center space-x-4">
                                <RadioGroup
                                    value={mode}
                                    onValueChange={(v) => setMode(v as Mode)}
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem
                                            value="existing"
                                            id="mode-existing"
                                        />
                                        <Label htmlFor="mode-existing">
                                            Vorhandene wählen
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem
                                            value="new"
                                            id="mode-new"
                                        />
                                        <Label htmlFor="mode-new">
                                            Neu anlegen
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>

                        {mode === "existing" ? (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label>Art</Label>
                                <div className="col-span-3">
                                    <Select
                                        value={selectedProfileName ?? ""}
                                        onValueChange={(v) =>
                                            setSelectedProfileName(
                                                v || undefined
                                            )
                                        }
                                        disabled={loadingProfiles}
                                    >
                                        <SelectTrigger className="w-full cursor-pointer border text-gray-700 border-gray-300 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-800">
                                            <SelectValue
                                                placeholder={
                                                    loadingProfiles
                                                        ? "Lade..."
                                                        : "Art auswählen"
                                                }
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {careProfiles.map((c) => (
                                                <SelectItem
                                                    key={c.id}
                                                    value={c.name ?? ""}
                                                >
                                                    {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Zeile 2: Name  */}
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label
                                        htmlFor="new-name"
                                        className="col-span-1"
                                    >
                                        Name
                                    </Label>
                                    <Input
                                        id="new-name"
                                        value={newName}
                                        onChange={(e) =>
                                            setNewName(e.target.value)
                                        }
                                        placeholder="Pflanzenname"
                                        className="col-span-2 border text-gray-700 border-gray-300 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-800"
                                    />
                                </div>

                                {/* Zeile 3: Vorschläge */}
                                {suggestions.length > 0 && (
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="col-span-1">
                                            Auswahl
                                        </Label>
                                        <div className="col-span-3">
                                            <Select
                                                value={
                                                    chosenId?.toString() || ""
                                                }
                                                onValueChange={(v) =>
                                                    setChosenId(Number(v))
                                                }
                                            >
                                                <SelectTrigger className="w-full cursor-pointer border text-gray-700 border-gray-300 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-800">
                                                    <SelectValue placeholder="Art auswählen" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {suggestions.map((s) => (
                                                        <SelectItem
                                                            key={s.id}
                                                            value={s.id.toString()}
                                                        >
                                                            {s.common_name ??
                                                                s.scientific_name.join(
                                                                    ", "
                                                                )}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}

                                {/* Zeile 4: Fehler oder Info */}
                                {(fetchError ||
                                    (newInterval != null &&
                                        newVolume != null)) && (
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <div className="col-span-4">
                                            {fetchError ? (
                                                <p className="text-sm text-red-600">
                                                    {fetchError}
                                                </p>
                                            ) : (
                                                <p className="text-sm text-gray-500">
                                                    Intervall: {newInterval}{" "}
                                                    Tage, Menge: {newVolume} ml
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Zeile: Methode auswählen */}
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label
                                        htmlFor="new-method"
                                        className="col-span-1"
                                    >
                                        Methode
                                    </Label>
                                    <div className="col-span-3">
                                        <Select
                                            value={newMethod}
                                            onValueChange={setNewMethod}
                                        >
                                            <SelectTrigger className="w-full cursor-pointer border text-gray-700 border-gray-300 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-800">
                                                <SelectValue placeholder="Methode wählen" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="nur die Erde gießen">
                                                    nur die Erde gießen
                                                </SelectItem>
                                                <SelectItem value="über die Blätter gießen">
                                                    über die Blätter gießen
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Zeile 5: Intervall-Feld */}
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label
                                        htmlFor="new-interval"
                                        className="col-span-1"
                                    >
                                        Intervall (Tage)
                                    </Label>
                                    <Input
                                        id="new-interval"
                                        type="number"
                                        value={newInterval ?? ""}
                                        onChange={(e) =>
                                            setNewInterval(
                                                Number(e.target.value)
                                            )
                                        }
                                        placeholder="z.B. 7"
                                        className="col-span-3 cursor-pointer border text-gray-700 border-gray-300 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-800"
                                    />
                                </div>

                                {/* Zeile 6: Menge-Feld */}
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label
                                        htmlFor="new-volume"
                                        className="col-span-1"
                                    >
                                        Menge (ml)
                                    </Label>
                                    <Input
                                        id="new-volume"
                                        type="number"
                                        value={newVolume ?? ""}
                                        onChange={(e) =>
                                            setNewVolume(Number(e.target.value))
                                        }
                                        placeholder="z.B. 500"
                                        className="col-span-3 cursor-pointer border text-gray-700 border-gray-300 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-800"
                                    />
                                </div>
                            </>
                        )}

                        {/* Stockwerk */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label>Stockwerk</Label>
                            <div className="col-span-3">
                                <Select
                                    value={selectedFloor?.toString() ?? ""}
                                    onValueChange={(v) =>
                                        setSelectedFloor(Number(v))
                                    }
                                >
                                    <SelectTrigger className="w-full cursor-pointer border text-gray-700 border-gray-300 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-800">
                                        <SelectValue placeholder="Stockwerk wählen" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {floors.map((f) => (
                                            <SelectItem
                                                key={f}
                                                value={f.toString()}
                                            >
                                                {f}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Standort */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label>Standort</Label>
                            <div className="col-span-3">
                                <Select
                                    value={selectedLocationId?.toString() ?? ""}
                                    onValueChange={(v) =>
                                        setSelectedLocationId(Number(v))
                                    }
                                    disabled={locations.length === 0}
                                >
                                    <SelectTrigger className="w-full cursor-pointer border text-gray-700 border-gray-300 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-800">
                                        <SelectValue
                                            placeholder={
                                                locations.length
                                                    ? "Standort wählen"
                                                    : "Bitte Stockwerk wählen"
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {locations.map((loc) => (
                                            <SelectItem
                                                key={loc.id}
                                                value={loc.id.toString()}
                                            >
                                                {loc.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label>Größe</Label>
                            <div className="col-span-3">
                                <Select
                                    value={size}
                                    onValueChange={(v) =>
                                        setSize(v as PlantSize)
                                    }
                                >
                                    <SelectTrigger className="w-full cursor-pointer border text-gray-700 border-gray-300 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-800">
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
                        </div>

                        {/* Bild-Upload */}
                        <div className="grid grid-cols-4 items-center gap-4 ">
                            <Label htmlFor="image">
                                Bild hochladen (optional)
                            </Label>
                            <Input
                                id="image"
                                type="file"
                                accept="image/*"
                                className="col-span-3 cursor-pointer border text-gray-700 border-gray-300 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-800"
                                onChange={(e) =>
                                    setFile(e.target.files?.[0] ?? null)
                                }
                            />
                        </div>

                        {/* Submit-Button */}
                        <DialogFooter>
                            <Button
                                type="submit"
                                className="cursor-pointer bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white dark:bg-emerald-600 dark:hover:bg-emerald-700"
                            >
                                Pflanze hinzufügen
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
