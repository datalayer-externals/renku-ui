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

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createSliceSelector } from "../../utils/customHooks/UseSliceSelector";
import { Display, ProjectConfig, SessionConfig } from "./display";

const initialState: Display = {
  modals: {
    ssh: {
      show: false,
      projectPath: "",
      gitUrl: "",
    },
    sessionLogs: {
      show: false,
      targetServer: "",
    },
  },
};

export const displaySlice = createSlice({
  name: "display",
  initialState,
  reducers: {
    showSshModal: (state, action: PayloadAction<ProjectConfig>) => {
      state.modals.ssh = {
        show: true,
        projectPath: action.payload.projectPath,
        gitUrl: action.payload.gitUrl,
      };
    },
    hideSshModal: (state) => {
      state.modals.ssh.show = false;
    },
    toggleSshModal: (state) => {
      state.modals.ssh.show = !state.modals.ssh.show;
    },

    showSessionLogsModal: (state, action: PayloadAction<SessionConfig>) => {
      state.modals.sessionLogs = {
        show: true,
        targetServer: action.payload.targetServer,
      };
    },
    hideSessionLogsModal: (state) => {
      state.modals.sessionLogs.show = false;
    },
    toggleSessionLogsModal: (state, action: PayloadAction<SessionConfig>) => {
      state.modals.sessionLogs = {
        show: !state.modals.sessionLogs.show,
        targetServer: action.payload.targetServer ?? "",
      };
    },

    reset: () => initialState,
  },
});

export const {
  showSshModal,
  hideSshModal,
  toggleSshModal,
  toggleSessionLogsModal,
  reset,
} = displaySlice.actions;

export const useDisplaySelector = createSliceSelector(displaySlice);
