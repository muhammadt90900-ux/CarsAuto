import { MultiLangContent } from "./index";
export interface Location {
    id: string;
    country: string;
    governorate?: string;
    city: string;
    name: MultiLangContent;
    lat: number;
    lng: number;
}
