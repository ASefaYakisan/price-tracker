// What /api/alerts/lookup returns for each alert a browser asks about.
export type AlertStatus =
  | {
      key: string;
      id: number;
      token: string;
      productId: number;
      email: string;
      target: number;
      sentAt: string | null;
      createdAt: string;
      title: string;
      source: string;
      imageUrl: string | null;
      currency: string | null;
      price: number | null;
      // products.last_error while the newest read of the page failed (see lastReadFailed), else null.
      readError: string | null;
    }
  | { key: string; missing: true };
