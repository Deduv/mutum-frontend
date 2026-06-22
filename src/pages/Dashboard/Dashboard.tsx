import { useEffect, useState, FormEvent, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../../components/ThemeToggle/ThemeToggle';
import { Card } from '../../components/Card/Card';
import { Button } from '../../components/Button/Button';
import { Input } from '../../components/Input/Input';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { clearToken } from '../../services/authStorage';
import { getOrganizations, getProjects, getTasks, getOrganizationMembers, createProject, createTask, updateTask, deleteProject, deleteTask } from '../../services/api';
import { getActiveOrganizationId, setActiveOrganizationId, clearActiveOrganizationId } from '../../services/workspaceStorage';
import { Project } from '../../types/project';
import { Task, TaskStatus } from '../../types/task';
import { Organization } from '../../types/organization';
import { OrganizationMember } from '../../types/member';
import styles from './Dashboard.module.css';

type ModalState = 'none' | 'select' | 'project' | 'task';
type ActiveView = 'projects' | 'tasks';
type ProjectSort = 'recent' | 'alphabetical';
type TaskSort = 'critical_first' | 'least_critical_first';
type TaskStatusFilter = 'All' | TaskStatus;

const PRIORITY_WEIGHT: Record<string, number> = {
  'CRITICAL': 4,
  'HIGH': 3,
  'MEDIUM': 2,
  'LOW': 1
};


type PendingDelete = { type: 'project' | 'task'; id: number } | null;



export function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View States
  const [activeView, setActiveView] = useState<ActiveView>('projects');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [projectSort, setProjectSort] = useState<ProjectSort>('recent');
  const [taskSort, setTaskSort] = useState<TaskSort>('critical_first');
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatusFilter>('All');

  // Modal State
  const [modalState, setModalState] = useState<ModalState>('none');

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [createProjectError, setCreateProjectError] = useState<string | null>(null);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskProjectId, setNewTaskProjectId] = useState<number | ''>('');
  const [newTaskPriority, setNewTaskPriority] = useState<string>('MEDIUM');
  const [newTaskAssignedUserId, setNewTaskAssignedUserId] = useState<number | ''>('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [createTaskError, setCreateTaskError] = useState<string | null>(null);

  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);
  
  // Delete States
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadRequestId = useRef(0);

  const handleLogout = useCallback(() => {
    clearToken();
    navigate('/login', { replace: true });
  }, [navigate]);

  const loadProjectsAndTasksForWorkspace = useCallback(async (orgId: number | null) => {
    const currentRequestId = ++loadRequestId.current;
    
    if (!orgId) {
      setProjects([]);
      setTasks([]);
      setLoading(false);
      return;
    }
    try {
      const [projectsRes, tasksRes, membersRes] = await Promise.all([
        getProjects(orgId),
        getTasks(orgId),
        getOrganizationMembers(orgId).catch(() => ({ data: [] }))
      ]);
      
      if (currentRequestId !== loadRequestId.current) return;
      
      setProjects(projectsRes.data);
      setTasks(tasksRes.data);
      setMembers(membersRes.data || []);
    } catch (err) {
      if (currentRequestId !== loadRequestId.current) return;
      setError('Não foi possível carregar os dados do workspace.');
      if (err instanceof Error && err.message.includes('401')) {
        handleLogout();
      }
    } finally {
      if (currentRequestId === loadRequestId.current) {
        setLoading(false);
      }
    }
  }, [handleLogout]);

  useEffect(() => {
    const loadOrganizations = async (): Promise<Organization[]> => {
      try {
        const res = await getOrganizations();
        setOrganizations(res.data);
        return res.data;
      } catch (err) {
        if (err instanceof Error && err.message.includes('401')) {
          handleLogout();
        }
        return [];
      }
    };

    const resolveActiveOrganizationId = (orgs: Organization[]): number | null => {
      if (orgs.length === 0) {
        clearActiveOrganizationId();
        return null;
      }
      const savedId = getActiveOrganizationId();
      if (savedId && orgs.some(o => o.id === savedId)) {
        return savedId;
      }
      const newId = orgs[0].id;
      setActiveOrganizationId(newId);
      return newId;
    };

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const orgs = await loadOrganizations();
        const activeId = resolveActiveOrganizationId(orgs);
        setActiveOrganizationIdState(activeId);
        await loadProjectsAndTasksForWorkspace(activeId);
      } catch {
        // Errors handled in inner functions
      }
    };

    fetchDashboardData();
  }, [handleLogout, loadProjectsAndTasksForWorkspace]);

  const handleOrganizationChange = (newOrgId: number) => {
    setActiveOrganizationIdState(newOrgId);
    setActiveOrganizationId(newOrgId);
    setSelectedProjectId(null);
    setActiveView('projects');
    setLoading(true);
    loadProjectsAndTasksForWorkspace(newOrgId);
  };

  useEffect(() => {
    if (taskStatusFilter === 'All') return;

    const currentTasks = selectedProjectId
      ? tasks.filter(t => t.project_id === selectedProjectId)
      : tasks;

    const hasStatus = currentTasks.some(t => t.status === taskStatusFilter);
    if (!hasStatus) {
      setTaskStatusFilter('All');
    }
  }, [selectedProjectId, tasks, taskStatusFilter]);

  const handleCreateProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeOrganizationId) {
      setCreateProjectError('Nenhum workspace ativo. Selecione ou crie um workspace.');
      return;
    }
    setIsCreatingProject(true);
    setCreateProjectError(null);

    try {
      await createProject(newProjectName, newProjectDesc, activeOrganizationId);
      setNewProjectName('');
      setNewProjectDesc('');
      const projectsRes = await getProjects(activeOrganizationId);
      setProjects(projectsRes.data);
      setModalState('none');
    } catch (err) {
      if (err instanceof Error) {
        setCreateProjectError(err.message);
      } else {
        setCreateProjectError('Erro inesperado ao criar o projeto.');
      }
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleCreateTask = async (e: FormEvent) => {
    e.preventDefault();
    if (newTaskProjectId === '') {
      setCreateTaskError('Por favor, selecione um projeto válido.');
      return;
    }

    setIsCreatingTask(true);
    setCreateTaskError(null);

    try {
      const assignedId = newTaskAssignedUserId === '' ? null : newTaskAssignedUserId;
      await createTask(newTaskTitle, newTaskDesc, Number(newTaskProjectId), newTaskPriority, assignedId);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskProjectId('');
      setNewTaskPriority('MEDIUM');
      setNewTaskAssignedUserId('');
      
      const tasksRes = await getTasks(activeOrganizationId || undefined);
      setTasks(tasksRes.data);
      setModalState('none');
    } catch (err) {
      if (err instanceof Error) {
        setCreateTaskError(err.message);
      } else {
        setCreateTaskError('Erro inesperado ao criar a tarefa.');
      }
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleUpdateTask = async (task: Task, updates: Partial<Task>) => {
    setUpdatingTaskId(task.id);
    setError(null);
    try {
      await updateTask(task.id, {
        title: task.title,
        description: task.description,
        priority: task.priority,
        assigned_user_id: task.assigned_user_id,
        status: task.status,
        ...updates
      });
      const tasksRes = await getTasks(activeOrganizationId || undefined);
      setTasks(tasksRes.data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro ao atualizar a tarefa.');
      }
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, type: 'project' | 'task', id: number) => {
    e.stopPropagation();
    setPendingDelete({ type, id });
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;

    setIsDeleting(true);
    setError(null);
    try {
      if (pendingDelete.type === 'project') {
        await deleteProject(pendingDelete.id);
        if (selectedProjectId === pendingDelete.id) {
          setSelectedProjectId(null);
          setActiveView('projects');
        }
      } else {
        await deleteTask(pendingDelete.id);
      }
      
      const [projectsRes, tasksRes] = await Promise.all([
        activeOrganizationId ? getProjects(activeOrganizationId) : Promise.resolve({ data: [], total: 0, skip: 0, limit: 0 }), 
        activeOrganizationId ? getTasks(activeOrganizationId) : Promise.resolve({ data: [], total: 0, skip: 0, limit: 0 })
      ]);
      setProjects(projectsRes.data);
      setTasks(tasksRes.data);
      
      setPendingDelete(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro ao deletar.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const closeModal = () => {
    setModalState('none');
    setCreateProjectError(null);
    setCreateTaskError(null);
  };

  // Derived Data
  const sortedProjects = [...projects].sort((a, b) => {
    if (projectSort === 'alphabetical') {
      return a.name.localeCompare(b.name);
    } else {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const filteredTasksByProject = selectedProjectId 
    ? tasks.filter(t => t.project_id === selectedProjectId)
    : tasks;

  const uniqueStatuses = new Set(filteredTasksByProject.map(t => t.status));
  const showStatusFilter = uniqueStatuses.size > 1;

  const filteredTasks = taskStatusFilter === 'All'
    ? filteredTasksByProject
    : filteredTasksByProject.filter(t => t.status === taskStatusFilter);

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const priorityA = PRIORITY_WEIGHT[a.priority] || 0;
    const priorityB = PRIORITY_WEIGHT[b.priority] || 0;
    
    if (taskSort === 'critical_first') return priorityB - priorityA;
    if (taskSort === 'least_critical_first') return priorityA - priorityB;
    
    return 0;
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <button 
            className={styles.titleButton}
            onClick={() => { setActiveView('projects'); setSelectedProjectId(null); }}
            aria-label="Return to main dashboard"
          >
            Dashboard
          </button>
        </h1>
        <div className={styles.headerActions}>
          {organizations.length > 0 ? (
            <select
              className={styles.workspaceSelector}
              value={activeOrganizationId || ''}
              onChange={(e) => handleOrganizationChange(Number(e.target.value))}
              aria-label="Select workspace"
            >
              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          ) : (
            <span className={styles.noWorkspaceMsg}>Nenhum workspace</span>
          )}
          <Button variant="primary" onClick={() => {
            if (!activeOrganizationId) {
              setError("Você precisa de um workspace para criar projetos.");
              return;
            }
            setModalState('select');
          }}>+ New</Button>
          <Button variant="secondary" onClick={() => navigate('/members')}>
            Members
          </Button>
          <Button variant="secondary" onClick={() => navigate('/invitations')}>
            Invitations
          </Button>
          <Button variant="secondary" onClick={() => navigate('/admin/users')}>
            Admin
          </Button>
          <ThemeToggle />
          <Button variant="secondary" onClick={handleLogout}>Logout</Button>
        </div>
      </header>

      <main className={styles.main}>
        {error ? (
           <div className={styles.errorBanner}>{error}</div>
        ) : loading ? (
           <div className={styles.loadingState}>
              <p>Carregando seus dados...</p>
           </div>
        ) : (
          <div className={styles.contentWrapper}>
            {activeOrganizationId && (
              <div className={styles.metricsGrid}>
                <div className={styles.metricCard}>
                  <div className={styles.metricValue}>{projects.length}</div>
                  <div className={styles.metricLabel}>Projects</div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricValue}>{tasks.length}</div>
                  <div className={styles.metricLabel}>Tasks</div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricValue}>{tasks.filter(t => t.status === 'TODO').length}</div>
                  <div className={styles.metricLabel}>TODO</div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricValue}>{tasks.filter(t => t.status === 'DOING').length}</div>
                  <div className={styles.metricLabel}>Doing</div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricValue}>{tasks.filter(t => t.status === 'DONE').length}</div>
                  <div className={styles.metricLabel}>Done</div>
                </div>
              </div>
            )}
            <div className={styles.viewControls}>
              <div className={styles.tabs}>
                <button 
                  className={`${styles.tab} ${activeView === 'projects' ? styles.activeTab : ''}`}
                  onClick={() => { setActiveView('projects'); setSelectedProjectId(null); }}
                >
                  Projects
                </button>
                <button 
                  className={`${styles.tab} ${activeView === 'tasks' ? styles.activeTab : ''}`}
                  onClick={() => setActiveView('tasks')}
                >
                  Tasks
                </button>
              </div>
            </div>

            {/* View Projects */}
            {activeView === 'projects' && (
              <Card className={styles.dashboardCard}>
                <div className={styles.cardHeaderRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 className={styles.cardHeader}>Projects</h2>
                    <span className={styles.badge}>{projects.length}</span>
                  </div>
                  <div className={styles.sortControl}>
                    <span className={styles.sortLabel}>Sort:</span>
                    <select 
                      className={styles.sortSelect} 
                      value={projectSort}
                      onChange={(e) => setProjectSort(e.target.value as ProjectSort)}
                    >
                      <option value="recent">Most recent</option>
                      <option value="alphabetical">Alphabetical</option>
                    </select>
                  </div>
                </div>
                {sortedProjects.length === 0 ? (
                  <p className={styles.emptyText}>Nenhum projeto encontrado.</p>
                ) : (
                  <ul className={styles.list}>
                    {sortedProjects.map((p) => (
                      <li 
                        key={p.id} 
                        className={`${styles.listItem} ${styles.clickableItem}`}
                        onClick={() => {
                          setSelectedProjectId(p.id);
                          setActiveView('tasks');
                        }}
                      >
                        <div className={styles.itemRow}>
                          <div className={styles.itemDetails}>
                            <div className={styles.itemTitle}>{p.name}</div>
                            {p.description && <div className={styles.itemSubtitle}>{p.description}</div>}
                          </div>
                          
                          <button 
                            className={styles.deleteButton}
                            onClick={(e) => handleDeleteClick(e, 'project', p.id)}
                            aria-label="Delete project"
                          >
                            &times;
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}

            {/* View Tasks */}
            {activeView === 'tasks' && (
              <Card className={styles.dashboardCard}>
                <div className={styles.cardHeaderRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedProjectId && (
                      <button 
                        className={styles.backButton}
                        onClick={() => {
                          setSelectedProjectId(null);
                          setActiveView('projects');
                        }}
                      >
                        ← Back
                      </button>
                    )}
                    <h2 className={styles.cardHeader}>
                      {selectedProjectId 
                        ? projects.find(p => p.id === selectedProjectId)?.name || 'Unknown'
                        : 'All Tasks'}
                    </h2>
                    <span className={styles.badge}>{sortedTasks.length}</span>
                  </div>
                  
                  <div className={styles.controlsGroup}>
                    <div className={styles.sortControl}>
                      <span className={styles.sortLabel}>Sort:</span>
                      <select 
                        className={styles.sortSelect} 
                        value={taskSort}
                        onChange={(e) => setTaskSort(e.target.value as TaskSort)}
                      >
                        <option value="critical_first">Most critical first</option>
                        <option value="least_critical_first">Least critical first</option>
                      </select>
                    </div>

                    {showStatusFilter && (
                      <div className={styles.sortControl}>
                        <span className={styles.sortLabel}>Filter by Status:</span>
                        <select 
                          className={styles.sortSelect} 
                          value={taskStatusFilter}
                          onChange={(e) => setTaskStatusFilter(e.target.value as TaskStatusFilter)}
                        >
                          <option value="All">All</option>
                          <option value="TODO">TODO</option>
                          <option value="DOING">DOING</option>
                          <option value="DONE">DONE</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                {sortedTasks.length === 0 ? (
                  <p className={styles.emptyText}>Nenhuma tarefa encontrada.</p>
                ) : (
                  <ul className={styles.list}>
                    {sortedTasks.map((t) => {
                      const projectForTask = projects.find(p => p.id === t.project_id);
                      const projectName = projectForTask ? projectForTask.name : 'Unknown';
                      
                      let assignedToText = 'Unassigned';
                      if (t.assigned_user_id !== null) {
                        const member = members.find(m => m.user_id === t.assigned_user_id);
                        assignedToText = member ? (member.name || member.email || `User ID: ${member.user_id}`) : 'Unknown member';
                      }

                      return (
                        <li key={t.id} className={styles.listItem}>
                          <div className={styles.itemRow}>
                            <div className={styles.itemDetails}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className={`${styles.itemTitle} ${t.status === 'DONE' ? styles.itemTitleDone : ''}`}>
                                  {t.title}
                                </span>
                                <span className={`${styles.priorityBadge} ${styles[`priority${t.priority}`]}`}>
                                  {t.priority}
                                </span>
                                {t.status === 'DONE' && (
                                  <span className={styles.doneIndicator}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '2px'}}>
                                      <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                    Done
                                  </span>
                                )}
                              </div>
                              <div className={styles.itemSubtitle}>
                                Project: {projectName} &bull; Assigned to: {assignedToText}
                              </div>
                            </div>
                            
                            <div className={styles.taskActions}>
                              <select
                                className={styles.statusSelect}
                                value={t.assigned_user_id === null ? '' : t.assigned_user_id}
                                disabled={updatingTaskId === t.id}
                                onChange={(e) => handleUpdateTask(t, { assigned_user_id: e.target.value === '' ? null : Number(e.target.value) })}
                                aria-label="Assign Task"
                              >
                                <option value="">Unassigned</option>
                                {members.map((m) => (
                                  <option key={m.user_id} value={m.user_id}>{m.name || m.email || `User ID: ${m.user_id}`}</option>
                                ))}
                              </select>
                              <select 
                                className={styles.statusSelect}
                                value={t.status}
                                disabled={updatingTaskId === t.id}
                                onChange={(e) => handleUpdateTask(t, { status: e.target.value as TaskStatus })}
                                aria-label="Task Status"
                              >
                                <option value="TODO">TODO</option>
                                <option value="DOING">DOING</option>
                                <option value="DONE">DONE</option>
                              </select>
                              <button 
                                className={styles.deleteButton}
                                onClick={(e) => handleDeleteClick(e, 'task', t.id)}
                                aria-label="Delete task"
                              >
                                &times;
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            )}
          </div>
        )}
      </main>

      <ConfirmDialog 
        isOpen={pendingDelete !== null}
        title={pendingDelete?.type === 'project' ? 'Delete project' : 'Delete task'}
        message={
          pendingDelete?.type === 'project' 
            ? 'Are you sure you want to delete this project? All tasks linked to it will also be deleted.'
            : 'Are you sure you want to delete this task?'
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      {/* Modal Overlay for New Project/Task */}
      {modalState !== 'none' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {(modalState === 'project' || modalState === 'task') && (
                  <button 
                    className={styles.modalBack} 
                    onClick={() => setModalState('select')}
                    aria-label="Back"
                  >
                    ←
                  </button>
                )}
                <h2 className={styles.modalTitle}>
                  {modalState === 'select' && 'Create New...'}
                  {modalState === 'project' && 'New Project'}
                  {modalState === 'task' && 'New Task'}
                </h2>
              </div>
              <button className={styles.modalClose} onClick={closeModal}>✕</button>
            </div>

            {modalState === 'select' && (
              <div className={styles.modalOptions}>
                <Button variant="secondary" onClick={() => setModalState('project')} style={{ justifyContent: 'flex-start' }}>
                  Project
                </Button>
                <Button variant="secondary" onClick={() => setModalState('task')} style={{ justifyContent: 'flex-start' }}>
                  Task
                </Button>
              </div>
            )}

            {modalState === 'project' && (
              <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {createProjectError && <div className={styles.errorBanner}>{createProjectError}</div>}
                <Input 
                  label="Name" 
                  placeholder="Project name" 
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  required
                />
                <Input 
                  label="Description" 
                  placeholder="Short description (optional)" 
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                />
                <Button type="submit" variant="primary" loading={isCreatingProject}>
                  Create project
                </Button>
              </form>
            )}

            {modalState === 'task' && (
              <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {createTaskError && <div className={styles.errorBanner}>{createTaskError}</div>}
                <Input 
                  label="Title" 
                  placeholder="Task title" 
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  required
                />
                <Input 
                  label="Description" 
                  placeholder="Task description (optional)" 
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                />
                
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Project</label>
                  <select 
                    className={styles.select} 
                    value={newTaskProjectId} 
                    onChange={(e) => setNewTaskProjectId(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                  >
                    <option value="" disabled>Select a project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Priority</label>
                  <select 
                    className={styles.select} 
                    value={newTaskPriority} 
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    required
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Assignee</label>
                  <select 
                    className={styles.select} 
                    value={newTaskAssignedUserId} 
                    onChange={(e) => setNewTaskAssignedUserId(e.target.value === '' ? '' : Number(e.target.value))}
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>{m.name || m.email || `User ID: ${m.user_id}`}</option>
                    ))}
                  </select>
                </div>

                <Button type="submit" variant="primary" loading={isCreatingTask}>
                  Create task
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
