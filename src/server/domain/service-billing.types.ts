export interface ServiceBillingItem {
  id?: string;
  serviceId: string;
  type: "SERVICE_FEE" | "ADDITIONAL";
  description: string;
  amount: number;
  sortOrder: number;
}

export interface ServiceBillingData {
  items: ServiceBillingItem[];
  totalBill: number;
}
