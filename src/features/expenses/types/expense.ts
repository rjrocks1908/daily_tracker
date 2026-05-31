export interface ExpenseTag {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseEntry {
  id: string;
  userId: string;
  amount: number;
  note: string;
  date: string; // YYYY-MM-DD
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseInput {
  userId: string;
  amount: number;
  note: string;
  date: string;
  tagIds: string[];
}

export interface UpdateExpenseInput {
  id: string;
  amount: number;
  note: string;
  date: string;
  tagIds: string[];
}

export interface CreateTagInput {
  userId: string;
  name: string;
}

export interface UpdateTagInput {
  id: string;
  name: string;
}
