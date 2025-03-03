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

import cx from "classnames";
import { useCallback, useContext, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { Collapse } from "reactstrap";
import { RenkuAlert } from "../../../components/Alert";
import ChevronFlippedIcon from "../../../components/icons/ChevronFlippedIcon";
import LazyRenkuMarkdown from "../../../components/markdown/LazyRenkuMarkdown";
import AppContext from "../../../utils/context/appContext";
import { validateDashboardMessageParams } from "../message/dashboardMessage.utils";
import {
  dashboardMessageSlice,
  useDashboardMessageSelector,
} from "../message/dashboardMessageSlice";
import styles from "./DashboardMessage.module.scss";

export default function DashboardMessage() {
  const { params } = useContext(AppContext);

  const dashboardParams = useMemo(
    () => validateDashboardMessageParams(params),
    [params]
  );

  const alreadyDismissed = useDashboardMessageSelector(
    (state) => state.dismissed
  );
  const dispatch = useDispatch();
  const dismiss = useCallback(
    () => dispatch(dashboardMessageSlice.actions.dismiss()),
    [dispatch]
  );

  if (!dashboardParams.enabled || alreadyDismissed) {
    return null;
  }

  const { text, additionalText, style, dismissible } = dashboardParams;

  const color = style === "plain" ? "primary" : style;

  return (
    <RenkuAlert
      className={cx(style === "plain" && styles.plainAlert)}
      color={color}
      timeout={0}
      dismissible={dismissible}
      dismissCallback={dismiss}
      dataCy="dashboard-message"
    >
      <LazyRenkuMarkdown markdownText={text} />
      <DashboardMessageMore additionalText={additionalText} />
    </RenkuAlert>
  );
}

function DashboardMessageMore({ additionalText }: { additionalText: string }) {
  const [show, setShow] = useState<boolean>(false);
  const toggleShow = useCallback(() => setShow((show) => !show), []);

  if (!additionalText) {
    return null;
  }

  return (
    <>
      <p>
        <a
          className={cx(styles.readMore, "d-inline-block", "cursor-pointer")}
          onClick={toggleShow}
        >
          Read more... <ChevronFlippedIcon className="ms-1" flipped={show} />
        </a>
      </p>
      <Collapse isOpen={show}>
        <LazyRenkuMarkdown markdownText={additionalText} />
      </Collapse>
    </>
  );
}
