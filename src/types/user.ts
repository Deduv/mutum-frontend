export type UserStatus = "PENDING" | "ACTIVE";

export interface User {
  id: number;
  name: string | null;
  email: string;
  status: UserStatus;
  created_at: string;
}

export interface UserListResponse {
  data: User[];
  total: number;
  skip: number;
  limit: number;
}
