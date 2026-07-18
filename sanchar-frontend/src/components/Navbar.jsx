import { Link, useLocation } from "react-router-dom";
import styles from "../styles/Navbar.module.css";
import SancharWordmark from "./SancharWordmark";

export default function Navbar() {
  const { pathname } = useLocation();
  const isLanding = pathname === "/";

  return (
    <nav className={`${styles.nav} ${isLanding ? styles.navFixed : ""}`}>
      <Link to="/" className={styles.logoLink}>
        <SancharWordmark size={19} glow={isLanding} />
      </Link>
      <div className={styles.links}>
        <NavLink to="/orders" pathname={pathname}>Orders</NavLink>
        <NavLink to="/scorecard" pathname={pathname}>Scorecard</NavLink>
      </div>
    </nav>
  );
}

function NavLink({ to, pathname, children }) {
  const active = pathname.startsWith(to);
  return (
    <Link to={to} className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}>
      {children}
    </Link>
  );
}
