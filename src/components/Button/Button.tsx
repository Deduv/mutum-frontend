import { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}

export function Button({ 
  children, 
  variant = 'primary', 
  loading = false, 
  disabled,
  className,
  ...props 
}: ButtonProps) {
  const rootClass = [
    styles.button, 
    styles[variant], 
    loading ? styles.loading : '',
    className || ''
  ].filter(Boolean).join(' ');

  return (
    <button 
      className={rootClass} 
      disabled={disabled || loading} 
      {...props}
    >
      {loading && <span className={styles.spinner} />}
      {children}
    </button>
  );
}
