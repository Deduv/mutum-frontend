import { useState, FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Card } from '../../components/Card/Card';
import { Input } from '../../components/Input/Input';
import { Button } from '../../components/Button/Button';
import { ThemeToggle } from '../../components/ThemeToggle/ThemeToggle';
import { login, createUser, ApiError } from '../../services/api';
import { setToken, getToken } from '../../services/authStorage';
import styles from './Login.module.css';
import logoLight from '../../assets/mutum_logo_light.svg';
import logoDark from '../../assets/mutum_logo_dark.svg';


type AuthMode = 'login' | 'signup';

export function Login() {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Se o usuário já possui token salvo, barra a renderização da tela de login
  // e o chuta diretamente pro Dashboard.
  if (getToken()) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await login(email, password);
      setToken(data.access_token);
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setError('Your access is still pending approval.');
        } else if (err.status === 401) {
          setError('Incorrect email or password.');
        } else {
          setError('Unable to sign in. Please try again.');
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await createUser(email, password);
      setEmail('');
      setPassword('');
      setShowSuccessModal(true);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    setAuthMode('login');
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.header}>
          <div className={styles.themeToggleWrapper}>
            <ThemeToggle />
          </div>
          <div className={styles.brand}>
            <div className={styles.logoIcon}>
              <img src={logoLight} alt="Mutum" className="logoLight" />
              <img src={logoDark} alt="Mutum" className="logoDark" />
            </div>
            <h1 className={styles.title}>mutum</h1>
          </div>
          <p className={styles.subtitle}>
            {authMode === 'login' ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${authMode === 'login' ? styles.activeTab : ''}`}
            onClick={() => { setAuthMode('login'); setError(null); }}
            type="button"
          >
            Login
          </button>
          <button 
            className={`${styles.tab} ${authMode === 'signup' ? styles.activeTab : ''}`}
            onClick={() => { setAuthMode('signup'); setError(null); }}
            type="button"
          >
            Sign Up
          </button>
        </div>

        <form className={styles.form} onSubmit={authMode === 'login' ? handleSignIn : handleSignUp}>
          {error && <div className={styles.errorBanner}>{error}</div>}
          
          <Input 
            label="Email" 
            type="email" 
            placeholder="name@example.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
          <Input 
            label="Password" 
            type="password" 
            placeholder="••••••••" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
          />
          <div className={styles.actions}>
            <Button type="submit" variant="primary" loading={loading} style={{ width: '100%' }}>
              {authMode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </div>
        </form>
      </Card>

      {showSuccessModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalDialog}>
            <h2 className={styles.modalTitle}>Account created</h2>
            <p className={styles.modalMessage}>
              Your request has been sent to the administrator. Once approved, you will be able to sign in.
            </p>
            <Button variant="primary" onClick={closeSuccessModal} style={{ width: '100%' }}>
              OK
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
