import type { NextPage } from "next";
import DefaultTemplateTable from "./default-template-table";
import styles from "./frame-component111.module.css";

export type FrameComponent111Type = {
  className?: string;
};

const FrameComponent111: NextPage<FrameComponent111Type> = ({
  className = "",
}) => {
  return (
    <section
      className={[styles.defaultTemplateTableParent, className].join(" ")}
    >
      <div className={styles.defaultTemplateTable}>
        <div className={styles.frameParent}>
          <div className={styles.frameGroup}>
            <div className={styles.productDescriptionParent}>
              <div className={styles.productDescription}>
                Product Description
              </div>
              <div className={styles.createAndSend}>
                Create and send unlimited professional invoices for free. Use
                our unique features to collect payments faster.
              </div>
            </div>
            <div className={styles.frameContainer}>
              <div className={styles.frameChild} />
              <div className={styles.frameItem} />
              <div className={styles.frameInner} />
              <div className={styles.frameDiv} />
            </div>
          </div>
          <div className={styles.hsnsacParent}>
            <div className={styles.hsnsac}>HSN/SAC</div>
            <div className={styles.uom}>UoM</div>
            <div className={styles.uom}>Qty</div>
            <div className={styles.uom}>Rate</div>
            <div className={styles.total}>Total</div>
          </div>
        </div>
      </div>
      <DefaultTemplateTable
        customPoloTShirts="Custom Polo T-shirts"
        prop="153"
        prop1="405.00"
        prop2="₹ 61,965.00"
      />
      <div className={styles.defaultTemplateTable2}>
        <div className={styles.frameParent2}>
          <div className={styles.frameParent3}>
            <div className={styles.customPantsSampleWrapper}>
              <div className={styles.customPantsSample}>
                Custom Pants (Sample)
              </div>
            </div>
            <div className={styles.frameParent4}>
              <div className={styles.frameChild} />
              <div className={styles.frameItem} />
              <div className={styles.frameInner} />
              <div className={styles.frameDiv} />
            </div>
          </div>
          <div className={styles.parent}>
            <div className={styles.div}>6109</div>
            <div className={styles.nos}>Nos.</div>
            <div className={styles.div2}>1</div>
            <div className={styles.div3}>150.00</div>
            <div className={styles.div4}>₹ 150.00</div>
          </div>
        </div>
      </div>
      <DefaultTemplateTable
        hMinWidth="125px"
        customPoloTShirts="Custom Jackets"
        prop="26"
        prop1="730.00"
        divWidth="unset"
        divJustifyContent="flex-end"
        divPadding="0px 0px 0px 38px"
        prop2="₹ 18,980.00"
        divFlex="unset"
        divTextAlign="left"
      />
      <div className={styles.defaultTemplateTable3}>
        <div className={styles.frameParent2}>
          <div className={styles.frameParent3}>
            <div className={styles.customPantsSampleWrapper}>
              <div className={styles.customPantsSample}>Custom Tracks</div>
            </div>
            <div className={styles.frameParent4}>
              <div className={styles.frameChild} />
              <div className={styles.frameItem} />
              <div className={styles.frameInner} />
              <div className={styles.frameDiv} />
            </div>
          </div>
          <div className={styles.parent}>
            <div className={styles.div}>6109</div>
            <div className={styles.nos}>Nos.</div>
            <div className={styles.div2}>29</div>
            <div className={styles.div3}>530.00</div>
            <div className={styles.div4}>₹ 15,370.00</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FrameComponent111;
