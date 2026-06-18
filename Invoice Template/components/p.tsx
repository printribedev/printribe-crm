import type { NextPage } from "next";
import styles from "./p.module.css";

export type PType = {
  className?: string;
};

const P: NextPage<PType> = ({ className = "" }) => {
  return (
    <div className={[styles.p, className].join(" ")}>
      <div className={styles.prvaKolaPlivanjaZaDojena}>
        <div className={styles.subTotalParent}>
          <div className={styles.subTotal}>Sub Total</div>
          <div className={styles.outputCgst25}>Output CGST(2.5%)</div>
          <div className={styles.outputCgst25}>Output SGST(2.5%)</div>
          <div className={styles.subTotal}>Output CGST(2.5%)</div>
          <div className={styles.subTotal}>Output SGST(2.5%)</div>
          <div className={styles.subTotal}>Total Tax(GST)</div>
          <div className={styles.subTotal}>Round Off</div>
        </div>
        <div className={styles.parent}>
          <div className={styles.div}>₹ 80,945.00</div>
          <div className={styles.div}>₹ 2,023.62</div>
          <div className={styles.div}>₹ 2,023.62</div>
          <div className={styles.div4}>₹ 22.50</div>
          <div className={styles.div4}>₹ 22.50</div>
          <div className={styles.div}>₹ 4,047.24</div>
          <div className={styles.div}>₹ 0.76</div>
        </div>
      </div>
      <div className={styles.amountDueParent}>
        <h3 className={styles.amountDue}>Amount Due</h3>
        <h3 className={styles.amountDue}>₹ 84,993.00</h3>
      </div>
      <div className={styles.h}>
        <div className={styles.forPrintribeNehalContainer}>
          <span className={styles.forPrintribe}>
            For PRINTRIBE
            <br />
          </span>
          <span className={styles.nehalGanapathy}>
            Nehal Ganapathy
            <br />
          </span>
          <span className={styles.forPrintribe}>Authorized Signatory</span>
        </div>
      </div>
    </div>
  );
};

export default P;
