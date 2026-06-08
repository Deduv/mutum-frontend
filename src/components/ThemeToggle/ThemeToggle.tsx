import { useTheme } from '../../hooks/useTheme';
import styles from './ThemeToggle.module.css';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme} className={styles.toggle} type="button">
      {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
    </button>
  );
}
