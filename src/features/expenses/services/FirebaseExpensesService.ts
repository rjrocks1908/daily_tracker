import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../../firebase/config";
import type {
  CreateExpenseInput,
  CreateTagInput,
  ExpenseEntry,
  ExpenseTag,
  UpdateExpenseInput,
  UpdateTagInput,
} from "../types/expense";

const EXPENSES_COLLECTION = "expenses";
const EXPENSE_TAGS_COLLECTION = "expense_tags";

class FirebaseExpensesService {
  private normalizeTagName(name: string): string {
    return name.trim().replace(/\s+/g, " ");
  }

  private validateAmount(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Amount must be greater than 0.");
    }
  }

  private sortExpensesByDateDesc(expenses: ExpenseEntry[]): ExpenseEntry[] {
    return expenses.sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }

  private sortTagsByName(tags: ExpenseTag[]): ExpenseTag[] {
    return tags.sort((a, b) => a.name.localeCompare(b.name));
  }

  async listUserExpenses(userId: string): Promise<ExpenseEntry[]> {
    const expensesRef = collection(db, EXPENSES_COLLECTION);
    const expensesQuery = query(expensesRef, where("userId", "==", userId));
    const snapshot = await getDocs(expensesQuery);

    const expenses = snapshot.docs.map((expenseDoc) => ({
      id: expenseDoc.id,
      ...(expenseDoc.data() as Omit<ExpenseEntry, "id">),
    }));

    return this.sortExpensesByDateDesc(expenses);
  }

  async listUserTags(userId: string): Promise<ExpenseTag[]> {
    const tagsRef = collection(db, EXPENSE_TAGS_COLLECTION);
    const tagsQuery = query(tagsRef, where("userId", "==", userId));
    const snapshot = await getDocs(tagsQuery);

    const tags = snapshot.docs.map((tagDoc) => ({
      id: tagDoc.id,
      ...(tagDoc.data() as Omit<ExpenseTag, "id">),
    }));

    return this.sortTagsByName(tags);
  }

  async createExpense(input: CreateExpenseInput): Promise<ExpenseEntry> {
    const amount = Number(input.amount);
    this.validateAmount(amount);

    const now = new Date().toISOString();
    const payload: Omit<ExpenseEntry, "id"> = {
      userId: input.userId,
      amount: Number(amount.toFixed(2)),
      note: input.note.trim(),
      date: input.date,
      tagIds: Array.from(new Set(input.tagIds)),
      createdAt: now,
      updatedAt: now,
    };

    const created = await addDoc(collection(db, EXPENSES_COLLECTION), payload);
    return { id: created.id, ...payload };
  }

  async updateExpense(input: UpdateExpenseInput): Promise<void> {
    const amount = Number(input.amount);
    this.validateAmount(amount);

    await updateDoc(doc(db, EXPENSES_COLLECTION, input.id), {
      amount: Number(amount.toFixed(2)),
      note: input.note.trim(),
      date: input.date,
      tagIds: Array.from(new Set(input.tagIds)),
      updatedAt: new Date().toISOString(),
    });
  }

  async deleteExpense(id: string): Promise<void> {
    await deleteDoc(doc(db, EXPENSES_COLLECTION, id));
  }

  async createTag(input: CreateTagInput): Promise<ExpenseTag> {
    const normalizedName = this.normalizeTagName(input.name);

    if (!normalizedName) {
      throw new Error("Tag name is required.");
    }

    const now = new Date().toISOString();
    const payload: Omit<ExpenseTag, "id"> = {
      userId: input.userId,
      name: normalizedName,
      budget: input.budget,
      createdAt: now,
      updatedAt: now,
    };

    const created = await addDoc(collection(db, EXPENSE_TAGS_COLLECTION), payload);
    return { id: created.id, ...payload };
  }

  async updateTag(input: UpdateTagInput): Promise<void> {
    const normalizedName = this.normalizeTagName(input.name);

    if (!normalizedName) {
      throw new Error("Tag name is required.");
    }

    const updateData: Record<string, unknown> = {
      name: normalizedName,
      updatedAt: new Date().toISOString(),
    };

    if (input.budget !== undefined) {
      updateData.budget = input.budget;
    }

    await updateDoc(doc(db, EXPENSE_TAGS_COLLECTION, input.id), updateData);
  }

  async deleteTagAndDetachExpenses(userId: string, tagId: string): Promise<void> {
    const expensesRef = collection(db, EXPENSES_COLLECTION);
    const expensesQuery = query(expensesRef, where("userId", "==", userId));
    const snapshot = await getDocs(expensesQuery);

    let batch = writeBatch(db);
    let operationCount = 0;

    for (const expenseDoc of snapshot.docs) {
      const data = expenseDoc.data() as Omit<ExpenseEntry, "id">;
      if (!data.tagIds?.includes(tagId)) {
        continue;
      }

      const nextTagIds = data.tagIds.filter((id) => id !== tagId);
      batch.update(doc(db, EXPENSES_COLLECTION, expenseDoc.id), {
        tagIds: nextTagIds,
        updatedAt: new Date().toISOString(),
      });

      operationCount += 1;

      // Keep a safe margin under Firestore's batch limit.
      if (operationCount >= 450) {
        await batch.commit();
        batch = writeBatch(db);
        operationCount = 0;
      }
    }

    if (operationCount > 0) {
      await batch.commit();
    }

    await deleteDoc(doc(db, EXPENSE_TAGS_COLLECTION, tagId));
  }
}

export const firebaseExpensesService = new FirebaseExpensesService();
