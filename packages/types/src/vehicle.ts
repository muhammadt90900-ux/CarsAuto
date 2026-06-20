import { MultiLangContent } from "./index";
export interface CarMake {
  id: string;
  name: MultiLangContent;
  logoUrl: string;
  country: string;
}

export interface CarModel {
  id: string;
  makeId: string;
  name: string;
  years: number[];
  bodyType: string;
}
