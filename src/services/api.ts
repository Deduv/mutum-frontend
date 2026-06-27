import { LoginResponse } from '../types/auth';
import { Project, ProjectListResponse } from '../types/project';
import { Task, TaskListResponse } from '../types/task';
import { OrganizationListResponse } from '../types/organization';
import { OrganizationMemberListResponse } from '../types/member';
import { OrganizationInvite, OrganizationInviteListResponse } from '../types/invite';
import { User, UserListResponse } from '../types/user';
import { getToken } from './authStorage';

const API_BASE_URL = 'https://api.labprojects.dev.br';

export class ApiError extends Error {
  constructor(public message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const params = new URLSearchParams();
  params.append('username', email);
  params.append('password', password);

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new ApiError(errorData?.detail || 'Failed to sign in. Please check your credentials.', response.status);
  }

  return response.json();
}

export async function createUser(email: string, password: string, name?: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/users/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    if (response.status === 409 || errorData?.detail?.includes('already registered')) {
      throw new ApiError('Email is already registered.', response.status);
    }
    throw new ApiError(errorData?.detail || `Failed to create user. (Status: ${response.status})`, response.status);
  }
}

export async function getOrganizations(): Promise<OrganizationListResponse> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/api/v1/organizations/`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch organizations. (Status: ${response.status})`);
  }

  return response.json();
}

export async function getOrganizationMembers(organizationId: number): Promise<OrganizationMemberListResponse> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/api/v1/organizations/${organizationId}/members`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 403 || response.status === 404) {
      throw new Error(`WorkspaceAccessError: ${response.status}`);
    }
    throw new Error(`Failed to fetch organization members. (Status: ${response.status})`);
  }

  const data = await response.json();
  if (Array.isArray(data)) {
    return { data, total: data.length };
  }
  return data;
}

export async function getOrganizationInvites(organizationId: number): Promise<OrganizationInviteListResponse> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/api/v1/organizations/${organizationId}/invites`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 403 || response.status === 404) {
      throw new Error(`WorkspaceAccessError: ${response.status}`);
    }
    throw new Error(`Failed to fetch organization invites. (Status: ${response.status})`);
  }

  const data = await response.json();
  if (Array.isArray(data)) {
    return { data, total: data.length };
  }
  return data;
}

export async function createOrganizationInvite(organizationId: number, email: string, role: string): Promise<OrganizationInvite> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/api/v1/organizations/${organizationId}/invites`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ email, role }),
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(`WorkspaceAccessError: 403`);
    }
    if (response.status === 404) {
      throw new Error(`WorkspaceAccessError: 404`);
    }
    throw new Error(`Failed to create invite. (Status: ${response.status})`);
  }

  return response.json();
}

export async function revokeOrganizationInvite(organizationId: number, inviteId: number): Promise<void> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/api/v1/organizations/${organizationId}/invites/${inviteId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(`WorkspaceAccessError: 403`);
    }
    if (response.status === 404) {
      throw new Error(`WorkspaceAccessError: 404`);
    }
    throw new Error(`Failed to revoke invite. (Status: ${response.status})`);
  }
}

export async function getPendingUsers(): Promise<UserListResponse> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/api/v1/users/pending`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(`AdminAccessError: 403`);
    }
    throw new Error(`Failed to fetch pending users. (Status: ${response.status})`);
  }

  const data = await response.json();
  if (Array.isArray(data)) {
    return { data, total: data.length, skip: 0, limit: data.length };
  }
  return data;
}

export async function approveUser(userId: number): Promise<User> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}/approve`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(`AdminAccessError: 403`);
    }
    if (response.status === 404) {
      throw new Error(`AdminAccessError: 404`);
    }
    throw new Error(`Failed to approve user. (Status: ${response.status})`);
  }

  return response.json();
}

export async function getProjects(organizationId?: number): Promise<ProjectListResponse> {
  const token = getToken();
  let url = `${API_BASE_URL}/api/v1/projects/`;
  if (organizationId !== undefined) {
    url += `?organization_id=${organizationId}`;
  }
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch projects. (Status: ${response.status})`);
  }

  return response.json();
}

export async function getTasks(organizationId?: number): Promise<TaskListResponse> {
  const token = getToken();
  let url = `${API_BASE_URL}/api/v1/tasks/`;
  if (organizationId !== undefined) {
    url += `?organization_id=${organizationId}`;
  }
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tasks. (Status: ${response.status})`);
  }

  return response.json();
}

type CreateProjectPayload = {
  name: string;
  description?: string;
  organization_id?: number;
};

export async function createProject(name: string, description: string, organizationId?: number): Promise<Project> {
  const token = getToken();
  const payload: CreateProjectPayload = { name, description };
  if (organizationId !== undefined) {
    payload.organization_id = organizationId;
  }
  
  const response = await fetch(`${API_BASE_URL}/api/v1/projects/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to create project. (Status: ${response.status})`);
  }

  return response.json();
}

type CreateTaskPayload = {
  title: string;
  description: string;
  project_id: number;
  priority: string;
  status: string;
  assigned_user_id?: number | null;
};

export async function createTask(
  title: string, 
  description: string, 
  project_id: number, 
  priority: string,
  assigned_user_id?: number | null
): Promise<Task> {
  const token = getToken();
  const payload: CreateTaskPayload = {
    title, 
    description, 
    project_id, 
    priority,
    status: 'TODO'
  };
  
  if (assigned_user_id !== undefined) {
    payload.assigned_user_id = assigned_user_id;
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/tasks/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to create task. (Status: ${response.status})`);
  }

  return response.json();
}

export async function updateTask(taskId: number, updates: Partial<Task>): Promise<Task> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Failed to update task. (Status: ${response.status})`);
  }

  return response.json();
}

export async function deleteProject(projectId: number): Promise<void> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/api/v1/projects/${projectId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete project. (Status: ${response.status})`);
  }
}

export async function deleteTask(taskId: number): Promise<void> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete task. (Status: ${response.status})`);
  }
}
