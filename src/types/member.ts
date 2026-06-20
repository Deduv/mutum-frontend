export type OrganizationRole = "OWNER" | "ADMIN" | "MEMBER";

export interface OrganizationMember {
  id: number;
  user_id: number;
  name: string | null;
  email: string;
  organization_id: number;
  role: OrganizationRole;
  joined_at: string;
}

export interface OrganizationMemberListResponse {
  data: OrganizationMember[];
  total: number;
}
