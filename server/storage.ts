export interface IStorage {
  getApiBaseUrl(): string;
  setApiBaseUrl(url: string): void;
}

export class MemStorage implements IStorage {
  private apiBaseUrl: string = "";

  getApiBaseUrl(): string {
    return this.apiBaseUrl;
  }

  setApiBaseUrl(url: string): void {
    this.apiBaseUrl = url;
  }
}

export const storage = new MemStorage();
