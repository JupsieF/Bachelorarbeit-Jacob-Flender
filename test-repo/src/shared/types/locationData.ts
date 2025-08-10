import { UserDetails } from "./user";

export type LocationProperties = {
    name: string;
    desklyID: string;
    x: number;
    y: number;
    floor: number;
};

export type DistancePair = {
    from: LocationProperties;
    to: LocationProperties;
    distance: number;
    fromUser?: UserDetails;
    toUser?: UserDetails;
};
