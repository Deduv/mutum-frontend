import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendingUsers, approveUser } from '../../services/api';
import { User } from '../../types/user';
import { Button } from '../../components/Button/Button';
import { ThemeToggle } from '../../components/ThemeToggle/ThemeToggle';
import { clearToken } from '../../services/authStorage';
import styles from './AdminUsers.module.css';

export function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [approvingUserId, setApprovingUserId] = useState<number | null>(null);

  const listRequestIdRef = useRef(0);

  const handleLogout = useCallback(() => {
    clearToken();
    navigate('/login', { replace: true });
  }, [navigate]);

  const fetchUsers = useCallback(async () => {
    const requestId = ++listRequestIdRef.current;
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const res = await getPendingUsers();
      if (requestId === listRequestIdRef.current) {
        setUsers(res.data);
      }
    } catch (err) {
      if (requestId === listRequestIdRef.current) {
        if (err instanceof Error && err.message.includes('AdminAccessError: 403')) {
          setError('You do not have permission to access this page.');
        } else {
          setError('Unable to load pending users.');
        }
        if (err instanceof Error && err.message.includes('401')) {
          handleLogout();
        }
      }
    } finally {
      if (requestId === listRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [handleLogout]);

  useEffect(() => {
    fetchUsers();
    return () => {
      listRequestIdRef.current += 1;
    };
  }, [fetchUsers]);

  const handleApprove = async (userId: number) => {
    setApprovingUserId(userId);
    setError(null);
    setSuccess(null);
    
    try {
      await approveUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setSuccess('User approved successfully.');
    } catch (err) {
      if (err instanceof Error && err.message.includes('AdminAccessError: 403')) {
        setError('You do not have permission to access this page.');
      } else if (err instanceof Error && err.message.includes('AdminAccessError: 404')) {
        setError('User no longer pending or not found.');
        setUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        setError('Failed to approve user.');
      }
    } finally {
      setApprovingUserId(null);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <Button variant="secondary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
          Admin Users
        </h1>
        <div className={styles.headerActions}>
          <ThemeToggle />
          <Button variant="secondary" onClick={handleLogout}>Logout</Button>
        </div>
      </header>

      <main className={styles.main}>
        {success && <div className={styles.successMessage}>{success}</div>}
        {error ? (
          <div className={styles.errorState}>{error}</div>
        ) : loading ? (
          <div className={styles.loadingState}>Loading pending users...</div>
        ) : users.length === 0 ? (
          <div className={styles.emptyState}>No pending users.</div>
        ) : (
          <div className={styles.grid}>
            {users.map(user => (
              <div key={user.id} className={styles.userCard}>
                <div className={styles.userName}>{user.name || 'No Name'}</div>
                <div className={styles.userEmail}>{user.email}</div>
                <div className={styles.userMeta}>
                  Registered: {new Date(user.created_at).toLocaleDateString()}
                </div>
                <div className={styles.badgeRow}>
                  <div className={`${styles.badge} ${styles[`status${user.status}`] || ''}`}>
                    {user.status}
                  </div>
                  <Button 
                    variant="primary" 
                    onClick={() => handleApprove(user.id)}
                    disabled={approvingUserId === user.id}
                  >
                    {approvingUserId === user.id ? 'Approving...' : 'Approve'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
