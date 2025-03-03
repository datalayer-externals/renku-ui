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

/**
 *  renku-ui
 *
 *  Clipboard.tsx
 *  Clipboard code and presentation.
 */

import { faCopy } from "@fortawesome/free-regular-svg-icons";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import cx from "classnames";
import React, {
  Fragment,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const COPY_TIMEOUT_MS = 3_000;

interface ClipboardProps {
  className?: string;
  clipboardText: string;
  children?: ReactNode;
}

export const Clipboard = ({
  className,
  clipboardText,
  children,
}: ClipboardProps) => {
  const [copied, setCopied] = useState(false);

  const currentTimeoutRef = useRef<number | null>(null);

  const onSuccess = useCallback(() => {
    currentTimeoutRef.current = window.setTimeout(() => {
      setCopied(false);
    }, COPY_TIMEOUT_MS);
    setCopied(true);
  }, []);

  const onCopyToClipboard = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      window.navigator.clipboard.writeText(clipboardText).then(() => {
        onSuccess();
      });
    },
    [clipboardText, onSuccess]
  );

  useEffect(() => {
    return () => {
      if (currentTimeoutRef.current) {
        window.clearTimeout(currentTimeoutRef.current);
      }
    };
  }, []);

  const Wrap = children
    ? ({ children }: { children?: ReactNode }) => (
        <span className="btn-icon-text">{children}</span>
      )
    : Fragment;

  return (
    <a
      className={cx(className, "text-decoration-none")}
      onClick={onCopyToClipboard}
    >
      <Wrap>
        <FontAwesomeIcon
          icon={copied ? faCheck : faCopy}
          size="1x"
          fixedWidth
        />
        {children}
      </Wrap>
    </a>
  );
};
