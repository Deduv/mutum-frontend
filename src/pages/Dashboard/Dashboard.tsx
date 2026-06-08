import { useEffect, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../../components/ThemeToggle/ThemeToggle';
import { Card } from '../../components/Card/Card';
import { Button } from '../../components/Button/Button';
import { Input } from '../../components/Input/Input';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { clearToken } from '../../services/authStorage';
import { getProjects, getTasks, createProject, createTask, updateTask, deleteProject, deleteTask } from '../../services/api';
import { Project } from '../../types/project';
import { Task, TaskStatus } from '../../types/task';
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
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [createTaskError, setCreateTaskError] = useState<string | null>(null);

  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);
  
  // Delete States
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [projectsRes, tasksRes] = await Promise.all([
        getProjects(),
        getTasks(),
      ]);
      setProjects(projectsRes.data);
      setTasks(tasksRes.data);
    } catch (err) {
      setError('Não foi possível carregar os dados. Verifique sua conexão ou tente logar novamente.');
      if (err instanceof Error && err.message.includes('401')) {
         handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

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

  const handleLogout = () => {
    clearToken();
    navigate('/login', { replace: true });
  };

  const handleCreateProject = async (e: FormEvent) => {
    e.preventDefault();
    setIsCreatingProject(true);
    setCreateProjectError(null);

    try {
      await createProject(newProjectName, newProjectDesc);
      setNewProjectName('');
      setNewProjectDesc('');
      const projectsRes = await getProjects();
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
      await createTask(newTaskTitle, newTaskDesc, Number(newTaskProjectId), newTaskPriority);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskProjectId('');
      setNewTaskPriority('MEDIUM');
      
      const tasksRes = await getTasks();
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

  const handleUpdateTaskStatus = async (task: Task, newStatus: TaskStatus) => {
    setUpdatingTaskId(task.id);
    setError(null);
    try {
      await updateTask(task.id, {
        title: task.title,
        description: task.description,
        priority: task.priority,
        assigned_user_id: task.assigned_user_id,
        status: newStatus
      });
      const tasksRes = await getTasks();
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
      
      const [projectsRes, tasksRes] = await Promise.all([getProjects(), getTasks()]);
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
        <h1 className={styles.title}>Dashboard</h1>
        <div className={styles.headerActions}>
          <Button variant="primary" onClick={() => setModalState('select')}>+ New</Button>
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
                              <div className={styles.itemSubtitle}>Project: {projectName}</div>
                            </div>
                            
                            <div className={styles.taskActions}>
                              <select 
                                className={styles.statusSelect}
                                value={t.status}
                                disabled={updatingTaskId === t.id}
                                onChange={(e) => handleUpdateTaskStatus(t, e.target.value as TaskStatus)}
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
