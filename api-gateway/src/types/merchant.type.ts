export type MerchantStatus = "active" | "inactive";

export type Merchant = {
  id: string;
  name: string;
  email: string;
  apiKey: string;
  status: MerchantStatus;
};
