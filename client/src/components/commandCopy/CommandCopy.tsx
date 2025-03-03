/*!
 * Copyright 2023 - Swiss Data Science Center (SDSC)
 * A partnership between École Polytechnique Fédérale de Lausanne (EPFL) and
 * Eidgenössische Technische Hochschule Zürich (ETHZ).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useState } from "react";
import cx from "classnames";
import { Clipboard } from "../clipboard/Clipboard";
import { ThrottledTooltip } from "../Tooltip";
import styles from "./CommandCopy.module.scss";

interface CommandCopyProps {
  command: string;
  noMargin?: boolean;
}

export const CommandCopy = ({ command, noMargin }: CommandCopyProps) => {
  const [randomIdForTooltip] = useState<string>(() => {
    const rand = `${Math.random()}`.slice(2);
    return `command-copy-${rand}`;
  });

  const tooltipContent = (
    <code className="text-white user-select-all">{command}</code>
  );

  return (
    <div
      className={cx(
        styles.main,
        "rounded overflow-hidden d-flex align-items-stretch",
        !noMargin && "my-2"
      )}
    >
      <span
        className={cx(
          "rounded-start border border-end-0 -border-primary overflow-hidden",
          "d-inline-flex align-middle align-items-center flex-grow-1 px-2"
        )}
      >
        <code
          id={randomIdForTooltip}
          className="text-truncate user-select-all mt-1"
        >
          {command}
        </code>
      </span>
      <Clipboard
        className={cx(
          styles.clipboardBtn,
          "rounded-end border d-inline-block align-middle cursor-pointer",
          "px-2 py-1"
        )}
        clipboardText={command}
      />
      <ThrottledTooltip
        target={randomIdForTooltip}
        tooltip={tooltipContent}
        autoHide={false}
      />
    </div>
  );
};
