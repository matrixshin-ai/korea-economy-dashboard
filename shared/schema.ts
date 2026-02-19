export * from "./models/auth";

export interface Essay {
  id: number;
  author: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface InsertEssay {
  author: string;
  title: string;
  content: string;
}
