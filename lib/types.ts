export type FlowerMeaning = {
  name: string;
  why: string;
  color: string;
};

export type BouquetPayload = {
  to: string;
  from: string;
  emotion: string;
  messageHtml: string;
  day: number | null;
  month: number | null;
  year: number | null;
  letter: string;
  flowers: FlowerMeaning[];
  flowerKeys: string[];
};

export type GenerateRequestBody = {
  to?: string;
  from?: string;
  emotion?: string;
  messageHtml?: string;
  day?: string | number;
  month?: string | number;
  year?: string | number;
};
