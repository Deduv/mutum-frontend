import { ThemeToggle } from './components/ThemeToggle/ThemeToggle';
import { Button } from './components/Button/Button';
import { Input } from './components/Input/Input';
import { Card } from './components/Card/Card';
import styles from './App.module.css';

function App() {
  return (
    <div className={styles.showcase}>
      <header className={styles.header}>
        <h1 className={styles.title}>DevBoard Design System</h1>
        <ThemeToggle />
      </header>

      <main>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Buttons</h2>
          <Card>
            <div className={styles.row}>
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="danger">Danger</Button>
            </div>
            <div className={styles.row} style={{ marginTop: '16px' }}>
              <Button variant="primary" disabled>Disabled</Button>
              <Button variant="primary" loading>Loading</Button>
            </div>
          </Card>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Inputs</h2>
          <Card>
            <div className={styles.grid}>
              <Input 
                label="Standard Input" 
                placeholder="Type here..." 
              />
              <Input 
                label="Input with Error" 
                placeholder="Invalid value" 
                error="This field is required" 
              />
            </div>
          </Card>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Cards</h2>
          <div className={styles.grid}>
            <Card>
              <h3 style={{ margin: '0 0 8px 0' }}>Card Title</h3>
              <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '14px' }}>
                This is the content of a basic card component. It uses the surface color and soft shadow.
              </p>
            </Card>
            <Card>
              <h3 style={{ margin: '0 0 8px 0' }}>Another Card</h3>
              <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '14px' }}>
                Cards provide a structured way to group information.
              </p>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
