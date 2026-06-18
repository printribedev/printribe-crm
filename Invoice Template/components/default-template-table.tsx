"use client";
import type { NextPage } from "next";
import { useMemo, type CSSProperties } from "react";
import styles from "./default-template-table.module.css";

export type DefaultTemplateTableType = {
  className?: string;
  customPoloTShirts?: string;
  prop?: string;
  prop1?: string;
  prop2?: string;

  /** Style props */
  hMinWidth?: CSSProperties["minWidth"];
  divWidth?: CSSProperties["width"];
  divJustifyContent?: CSSProperties["justifyContent"];
  divPadding?: CSSProperties["padding"];
  divFlex?: CSSProperties["flex"];
  divTextAlign?: CSSProperties["textAlign"];
};

const DefaultTemplateTable: NextPage<DefaultTemplateTableType> = ({
  className = "",
  hMinWidth,
  customPoloTShirts,
  prop,
  prop1,
  divWidth,
  divJustifyContent,
  divPadding,
  prop2,
  divFlex,
  divTextAlign,
}) => {
  const hStyle: CSSProperties = useMemo(() => {
    return {
      minWidth: hMinWidth,
    };
  }, [hMinWidth]);

  const divStyle: CSSProperties = useMemo(() => {
    return {
      width: divWidth,
      justifyContent: divJustifyContent,
      padding: divPadding,
    };
  }, [divWidth, divJustifyContent, divPadding]);

  const div1Style: CSSProperties = useMemo(() => {
    return {
      flex: divFlex,
      textAlign: divTextAlign,
    };
  }, [divFlex, divTextAlign]);

  return (
    <div className={[styles.defaultTemplateTable, className].join(" ")}>
      <div className={styles.hmargin}>
        <div className={styles.h} style={hStyle}>
          <div className={styles.bezHlora}>
            <div className={styles.customPoloTShirts}>{customPoloTShirts}</div>
          </div>
          <div className={styles.frameParent}>
            <div className={styles.frameChild} />
            <div className={styles.frameItem} />
            <div className={styles.frameInner} />
            <div className={styles.frameDiv} />
          </div>
        </div>
        <div className={styles.parent}>
          <div className={styles.div}>6109</div>
          <div className={styles.div}>Nos.</div>
          <div className={styles.div}>{prop}</div>
          <div className={styles.div}>{prop1}</div>
          <div className={styles.div4} style={divStyle}>
            <div className={styles.div5} style={div1Style}>
              {prop2}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DefaultTemplateTable;
