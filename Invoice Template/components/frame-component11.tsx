import type { NextPage } from "next";
import Image from "next/image";
import styles from "./frame-component11.module.css";

export type FrameComponent11Type = {
  className?: string;
};

const FrameComponent11: NextPage<FrameComponent11Type> = ({
  className = "",
}) => {
  return (
    <section className={[styles.frameParent, className].join(" ")}>
      <div className={styles.frameGroup}>
        <div className={styles.frameWrapper}>
          <div className={styles.gstInvoiceWrapper}>
            <h1 className={styles.gstInvoice}>GST Invoice</h1>
          </div>
        </div>
        <div className={styles.frameContainer}>
          <div className={styles.invoiceNoParent}>
            <div className={styles.invoiceNo}>Invoice No.</div>
            <div className={styles.ptpi0212627}>PT/PI/021/26-27</div>
          </div>
          <div className={styles.invoiceNoParent}>
            <div className={styles.invoiceNo}>Invoice Date</div>
            <div className={styles.june172026}>June 17, 2026</div>
          </div>
        </div>
      </div>
      <Image
        className={styles.printribeLogoTmWithoutBg1Icon}
        loading="lazy"
        width={402}
        height={76}
        sizes="100vw"
        alt=""
        src="/Printribe-Logo-TM-without-bg-1@2x.png"
      />
    </section>
  );
};

export default FrameComponent11;
