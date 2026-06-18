import type { NextPage } from "next";
import Image from "next/image";
import styles from "./frame-component1.module.css";

export type FrameComponent1Type = {
  className?: string;
};

const FrameComponent1: NextPage<FrameComponent1Type> = ({ className = "" }) => {
  return (
    <section className={[styles.frameParent, className].join(" ")}>
      <div className={styles.frameGroup}>
        <div className={styles.amountChargeableInclTaxIWrapper}>
          <div className={styles.amountChargeableIncl}>
            Amount Chargeable incl. tax (in words)
          </div>
        </div>
        <div className={styles.h}>
          <b className={styles.inrEightyFour}>
            INR Eighty Four Thousand Nine Hundred And Ninety Three Only
          </b>
        </div>
      </div>
      <div className={styles.frameWrapper}>
        <div className={styles.frameContainer}>
          <div className={styles.pParent}>
            <div className={styles.p}>
              <div className={styles.amountChargeableIncl}>
                Bank Account Details
              </div>
            </div>
            <div className={styles.pridruiteSeZajedniciOdPre}>
              <div className={styles.bankNameParent}>
                <div className={styles.bankName}>Bank Name</div>
                <div className={styles.bankName}>Account Holder Name</div>
                <div className={styles.bankName}>Account Number</div>
                <div className={styles.bankName}>IFSC</div>
                <div className={styles.accountType}>Account Type</div>
              </div>
              <div className={styles.hdfcBankAmruthalliBranchParent}>
                <div className={styles.hdfcBankAmruthalli}>
                  HDFC Bank, Amruthalli Branch
                </div>
                <div className={styles.hdfcBankAmruthalli}>PRINTRIBE</div>
                <div className={styles.hdfcBankAmruthalli}>59209967439181</div>
                <div className={styles.hdfcBankAmruthalli}>HDFC0004829</div>
                <div className={styles.hdfcBankAmruthalli}>Current</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.h2}>
        <div className={styles.vodaJeNjihovPrirodniDom}>
          <div className={styles.termsAndConditions}>Terms and Conditions</div>
          <div className={styles.checkboxcomponent}>
            <div className={styles.checkboxBase}>
              <div className={styles.checkboxBaseChild} />
              <button className={styles.checkboxPropertiesParent}>
                <div className={styles.checkboxProperties}>
                  <div className={styles.checkbox}>
                    <Image
                      className={styles.checkIcon}
                      width={8}
                      height={8}
                      sizes="100vw"
                      alt=""
                    />
                  </div>
                </div>
                <div className={styles.text}>Hide Bank Details</div>
              </button>
              <div className={styles.textWrapper}>
                <div className={styles.text2}>Add any helptext if any</div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.ourResponsibilityCeasesOnceParent}>
          <div className={styles.inrEightyFour}>
            Our responsibility ceases once the goods leave our premises/factory.
            Goods once sold cannot be exchanged/returned. All disputes subject
            to Bangalore Jurisdiction Only.
            <br />
            By signing this copy/accepting delivery, you agree to the above
            terms of sales.
          </div>
          <div className={styles.thankYouFor}>
            Thank you for your valuable order.
          </div>
        </div>
      </div>
    </section>
  );
};

export default FrameComponent1;
