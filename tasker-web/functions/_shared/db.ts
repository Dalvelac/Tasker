export type D1Value = string | number | null;

type D1Result<T> = {
  results: T[];
  meta: {
    last_row_id?: number;
    changes?: number;
  };
};

type D1PreparedStatement = {
  bind(...values: D1Value[]): D1PreparedStatement;
  all<T = unknown>(): Promise<D1Result<T>>;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<D1Result<unknown>>;
};

export type D1Database = {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
};

export interface Env {
  DB: D1Database;
}

export type AppContext = {
  request: Request;
  env: Env;
  params?: Record<string, string>;
};
