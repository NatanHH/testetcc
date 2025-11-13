import React from "react";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <p className={styles.footerText}>
        © {new Date().getFullYear()} - Este site foi desenvolvido sem fins
        lucrativos para fins educacionais.
      </p>
    </footer>
  );
}
