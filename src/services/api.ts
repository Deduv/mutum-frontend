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
    throw new ApiError(errorData?.detail || 'Erro ao realizar login. Verifique suas credenciais.', response.status);
  }

  return response.json();
}

export async function createUser(email: string, password: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/users/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
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
    throw new Error(`Falha ao buscar organizações. (Status: ${response.status})`);
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
    throw new Error(`Falha ao buscar membros da organização. (Status: ${response.status})`);
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
    throw new Error(`Falha ao buscar convites da organização. (Status: ${response.status})`);
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
    throw new Error(`Falha ao criar convite. (Status: ${response.status})`);
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
    throw new Error(`Falha ao revogar convite. (Status: ${response.status})`);
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
    throw new Error(`Falha ao buscar usuários pendentes. (Status: ${response.status})`);
  }

  return response.json();
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
    throw new Error(`Falha ao aprovar usuário. (Status: ${response.status})`);
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
    throw new Error(`Falha ao buscar os projetos. (Status: ${response.status})`);
  }

  return response.json();
}

export async function getTasks(): Promise<TaskListResponse> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/api/v1/tasks/`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao buscar as tarefas. (Status: ${response.status})`);
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
    throw new Error(`Falha ao criar o projeto. (Status: ${response.status})`);
  }

  return response.json();
}

export async function createTask(
  title: string, 
  description: string, 
  project_id: number, 
  priority: string
): Promise<Task> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/api/v1/tasks/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ 
      title, 
      description, 
      project_id, 
      priority,
      status: 'TODO'
    }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao criar a tarefa. (Status: ${response.status})`);
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
    throw new Error(`Falha ao atualizar a tarefa. (Status: ${response.status})`);
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
    throw new Error(`Falha ao deletar o projeto. (Status: ${response.status})`);
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
    throw new Error(`Falha ao deletar a tarefa. (Status: ${response.status})`);
  }
}
