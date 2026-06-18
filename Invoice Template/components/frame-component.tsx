"use client";
import type { NextPage } from "next";
import { useMemo, type CSSProperties } from "react";
import styles from "./frame-component.module.css";

export type FrameComponentType = {
  className?: string;
  billedBy?: string;
  pRINTRIBE?: string;
  mallayyaIndustrialAreaKeregu?: string;
  aBAFP5040J1Z6?: string;
  infotheprintribecom?: string;
  prop?: string;

  /** Style props */
  frameDivMinWidth?: CSSProperties["minWidth"];
  emailWidth?: CSSProperties["width"];
  emailMinWidth?: CSSProperties["minWidth"];
};

const FrameComponent: NextPage<FrameComponentType> = ({
  className = "",
  frameDivMinWidth,
  billedBy,
  pRINTRIBE,
  mallayyaIndustrialAreaKeregu,
  aBAFP5040J1Z6,
  emailWidth,
  emailMinWidth,
  infotheprintribecom,
  prop,
}) => {
  const frameDivStyle: CSSProperties = useMemo(() => {
    return {
      minWidth: frameDivMinWidth,
    };
  }, [frameDivMinWidth]);

  const emailStyle: CSSProperties = useMemo(() => {
    return {
      width: emailWidth,
      minWidth: emailMinWidth,
    };
  }, [emailWidth, emailMinWidth]);

  return (
    <div
      className={[styles.billedByParent, className].join(" ")}
      style={frameDivStyle}
    >
      <div className={styles.billedBy}>{billedBy}</div>
      <div className={styles.frameParent}>
        <div className={styles.printribeParent}>
          <h3 className={styles.printribe}>{pRINTRIBE}</h3>
          <div className={styles.mallayyaIndustrialArea}>
            {mallayyaIndustrialAreaKeregu}
          </div>
        </div>
        <div className={styles.gstinParent}>
          <div className={styles.gstin}>GSTIN</div>
          <div className={styles.infotheprintribecom}>{aBAFP5040J1Z6}</div>
        </div>
        <div className={styles.gstinParent}>
          <div className={styles.email} style={emailStyle}>
            Email
          </div>
          <div className={styles.infotheprintribecom}>
            {infotheprintribecom}
          </div>
        </div>
        <div className={styles.gstinParent}>
          <div className={styles.phone}>Phone</div>
          <div className={styles.infotheprintribecom}>{prop}</div>
        </div>
      </div>
    </div>
  );
};

export default FrameComponent;
