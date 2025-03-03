/*!
 * Copyright 2022 - Swiss Data Science Center (SDSC)
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

import { checkWsServerMessage, WsMessage, WsServerMessage } from "./WsMessages";
import {
  handleUserInit,
  handleUserUiVersion,
  handleUserError,
} from "./handlers/userHandlers";
import { handleSessionsStatus } from "./handlers/sessionStatusHandler";
import { handleKgActivationStatus } from "./handlers/kgActivationStatusHandler";
import { InactiveKgProjects } from "../features/inactiveKgProjects/InactiveKgProjects";
import { StateModel } from "../model";
import APIClient from "../api-client";

const timeoutIntervalMs = 45 * 1000; // ? set to 0 to disable
const reconnectIntervalMs = 10 * 1000;
const reconnectPenaltyFactor = 1.5;

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */

// *** Accepted messages ***

interface MessageData {
  required: Array<string> | null;
  optional: Array<string> | null;
  handler: Function;
}

const messageHandlers: Record<string, Record<string, Array<MessageData>>> = {
  user: {
    init: [
      {
        required: null,
        optional: ["message"],
        handler: handleUserInit,
      },
    ],
    version: [
      {
        required: ["version"],
        optional: ["start", "message"],
        handler: handleUserUiVersion,
      },
    ],
    activation: [
      {
        required: null,
        optional: ["message"],
        handler: handleKgActivationStatus,
      },
    ],
    ack: [
      {
        required: null,
        optional: ["message"],
        handler: () => {
          // eslint-disable-line @typescript-eslint/no-empty-function
        },
      },
    ],
    error: [
      {
        required: null,
        optional: ["message"],
        handler: () => handleUserError,
      },
    ],
    test: [
      {
        required: null,
        optional: ["message"],
        handler: () => ({ test: true }),
      },
    ],
    sessionStatus: [
      {
        required: null,
        optional: ["message"],
        handler: handleSessionsStatus,
      },
    ],
  },
};

// *** WebSocket startup and configuration ***

/**
 * Setup WebSocket channel.
 * @param webSocketUrl - target URL
 * @param fullModel - global model
 * @param getLocation - function to get location
 * @param client - api client
 * @param notifications - global notifications service
 */
function setupWebSocket(
  webSocketUrl: string,
  fullModel: StateModel,
  getLocation: Function,
  client: APIClient,
  notifications: any
) {
  const model = fullModel.subModel("webSocket");
  const webSocket = new WebSocket(webSocketUrl);
  model.setObject({ open: false, reconnect: { retrying: false } });

  function pingWebSocketServer(targetWebSocket: WebSocket) {
    if (
      model.get("open") &&
      targetWebSocket.readyState === targetWebSocket.OPEN
    ) {
      const pingMessage = new WsMessage({}, "ping");
      targetWebSocket.send(pingMessage.toString());
      model.setObject({ lastPing: new Date(pingMessage.timestamp) });
      setTimeout(() => pingWebSocketServer(targetWebSocket), timeoutIntervalMs);
    }
  }

  function startPullingSessionStatus(targetWebSocket: WebSocket) {
    targetWebSocket.send(
      JSON.stringify(new WsMessage({}, "pullSessionStatus"))
    );
  }

  function resumePendingKgActivation(model: any, socket: any) {
    const state = model?.reduxStore?.getState();
    // kgInactiveProjects
    const projectsInProgress = state?.kgInactiveProjects;
    const projectIds = projectsInProgress
      ?.filter((project: InactiveKgProjects) => {
        return (
          project.progressActivation !== null &&
          project.progressActivation !== 100
        );
      })
      .map((p: InactiveKgProjects) => p.id);

    if (projectIds.length) {
      const message = JSON.stringify(
        new WsMessage({ projects: projectIds }, "pullKgActivationStatus")
      );
      socket.send(message);
    }
  }

  function resumePendingProcesses(model: any, socket: any) {
    resumePendingKgActivation(model, socket);
  }

  webSocket.onopen = (status) => {
    // start pinging regularly when the connection is open
    const target = status.target as WebSocket;
    const webSocketOpen = !!(target && target["readyState"]);
    if (webSocketOpen) {
      model.setObject({ open: true, error: false, lastReceived: null });
      // request session status
      startPullingSessionStatus(webSocket);
      // resume running processes
      resumePendingProcesses(fullModel, webSocket);
    }

    // Start a ping loop -- this should keep the connection alive
    if (timeoutIntervalMs)
      setTimeout(() => pingWebSocketServer(webSocket), timeoutIntervalMs);
  };

  webSocket.onerror = (error) => {
    model.setObject({
      open: false,
      error: true,
      errorObject: error,
      lastReceived: new Date(),
    });
  };

  webSocket.onclose = (data) => {
    let wsData: Record<string, unknown> = { open: false, error: false };

    // abnormal closure, restart the socket.
    if (data.code === 1006 || data.code === 4000)
      wsData = {
        ...wsData,
        error: true,
        errorObject: { message: `WebSocket channel error ${data.code}` },
      };
    model.setObject(wsData);

    if (data.code === 1006 || data.code === 4000)
      retryConnection(
        webSocketUrl,
        fullModel,
        getLocation,
        client,
        notifications
      );
  };

  webSocket.onmessage = (message) => {
    model.set("lastReceived", new Date());
    // handle the message
    if (message.type === "message" && message.data) {
      // Try to parse the message to a WsServerMessage
      let serverMessage: WsServerMessage;
      try {
        serverMessage = JSON.parse(message.data as string);
        const res = checkWsServerMessage(serverMessage);
        if (!res)
          throw new Error(
            "WebSocket message is a valid JSON object but not a WsServerMessage"
          );
      } catch (error) {
        model.setObject({
          error: true,
          errorObject: {
            ...(error as Error),
            message:
              "Incoming message bad formed: " + (error as Error).toString(),
          },
        });
        return false;
      }

      // Validate the message and find the instructions
      const handler = getWsServerMessageHandler(messageHandlers, serverMessage);

      if (typeof handler === "string") {
        model.setObject({
          error: true,
          errorObject: { message: `${handler}\nmessage: ${message}` },
        });
        return false;
      }

      // execute the command
      try {
        // ? Mind we are passing the full model, not just model
        const outcome = handler(
          serverMessage.data,
          webSocket,
          fullModel,
          getLocation,
          client,
          notifications
        );
        if (outcome && model.get("error")) model.set("error", false);
        else if (!outcome && !model.get("error")) model.set("error", true);
      } catch (error) {
        const info = `Error while executing the '${
          serverMessage.type
        }' command: ${(error as Error).toString()}`;
        model.setObject({
          error: true,
          errorObject: {
            ...(error as Error),
            message: `${info}\nmessage: ${message}`,
          },
        });
      }
    } else {
      model.setObject({
        error: true,
        errorObject: { message: `Unexpected message: ${message}` },
      });
    }
  };

  return webSocket;
}

// *** Helper functions ***

/**
 * Either get the handler function for the specific client message, or a sentence explaining the error.
 * @param acceptedMessages - list of accepted WsClient messages
 * @param serverMessage - message from the client
 * @returns handler function or error message
 */
function getWsServerMessageHandler(
  acceptedMessages: Record<string, Record<string, Array<MessageData>>>,
  serverMessage: WsServerMessage
): Function | string {
  if (!acceptedMessages[serverMessage.scope])
    return `Scope '${serverMessage.scope}' is not supported.`;
  const acceptedScopeMessages = acceptedMessages[serverMessage.scope];
  if (!acceptedScopeMessages[serverMessage.type])
    return `Type '${serverMessage.type}' is not supported for the scope '${serverMessage.scope}'.`;

  // match proper instruction set for the message type
  const dataProps = Object.keys(serverMessage.data);
  for (const instruction of acceptedScopeMessages[serverMessage.type]) {
    let valid = true;
    // must have all the required
    if (instruction.required) {
      for (const required of instruction.required) {
        if (!dataProps.includes(required)) {
          valid = false;
          break;
        }
      }
    }
    // can have only required or optional
    if (valid) {
      for (const prop of dataProps) {
        if (
          !instruction.required?.includes(prop) &&
          !instruction.optional?.includes(prop)
        ) {
          valid = false;
          break;
        }
      }
    }

    // stop when found a valid one
    if (valid) return instruction.handler;
  }
  return `Could not find a proper handler; data is wrong for a '${serverMessage.type}' instruction.`;
}

/**
 * Retry connection when it fails, keeping track of the attempts.
 * @param webSocketUrl - target URL
 * @param fullModel - global model
 * @param getLocation - function to get location
 * @param client - api client
 * @param notifications - global notifications service
 */
function retryConnection(
  webSocketUrl: string,
  fullModel: StateModel,
  getLocation: Function,
  client: APIClient,
  notifications: any
) {
  const reconnectModel = fullModel.subModel("webSocket.reconnect");
  const reconnectData = reconnectModel.get("");
  // reset timer after 1 hour
  const oneHourAgo = new Date().setHours(new Date().getHours() - 1);
  if (reconnectData.lastTime && reconnectData.lastTime < oneHourAgo)
    reconnectData.attempts = 0;
  reconnectData.lastTime = new Date();
  reconnectData.attempts++;
  reconnectData.retrying = true;
  const delay =
    reconnectPenaltyFactor ** reconnectData.attempts * reconnectIntervalMs;
  reconnectModel.setObject(reconnectData);
  setTimeout(
    () =>
      setupWebSocket(
        webSocketUrl,
        fullModel,
        getLocation,
        client,
        notifications
      ),
    delay
  );
}

export { getWsServerMessageHandler, retryConnection, setupWebSocket };
export type { MessageData };
