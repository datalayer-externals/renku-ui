/*!
 * Copyright 2017 - Swiss Data Science Center (SDSC)
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
 *  incubator-renku-ui
 *
 *  App.js
 *  Coordinator for the application.
 */

import { Fragment, useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { useSelector } from "react-redux";
import { Redirect } from "react-router";
import { Route, Switch } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import { LoginHelper, LoginRedirect } from "./authentication";
import { Loader } from "./components/Loader";
import ShowDataset from "./dataset/Dataset.container";
import { DatasetCoordinator } from "./dataset/Dataset.state";
import DatasetAddToProject from "./dataset/addtoproject/DatasetAddToProject";
import AdminPage from "./features/admin/AdminPage";
import { Dashboard } from "./features/dashboard/Dashboard";
import InactiveKGProjectsPage from "./features/inactiveKgProjects/InactiveKgProjects";
import SearchPage from "./features/kgSearch/KgSearchPage";
import { Unavailable } from "./features/maintenance/Maintenance";
import AnonymousSessionsList from "./features/session/components/AnonymousSessionsList";
import { useGetUserInfoQuery } from "./features/user/keycloakUser.api";
import Help from "./help";
import { AnonymousHome, FooterNavbar, RenkuNavBar } from "./landing";
import { NotFound } from "./not-found";
import { NotificationsManager, NotificationsPage } from "./notifications";
import { Cookie, Privacy } from "./privacy";
import { Project } from "./project";
import { ProjectList } from "./project/list";
import { NewProject } from "./project/new";
import { StyleGuide } from "./styleguide";
import AppContext from "./utils/context/appContext";
import { Url } from "./utils/helpers/url";
import { setupWebSocket } from "./websocket";

import "react-toastify/dist/ReactToastify.css";
import "./App.css";

export const ContainerWrap = ({ children, fullSize = false }) => {
  const classContainer = !fullSize
    ? "container-xxl py-4 mt-2 renku-container"
    : "w-100";
  return <div className={classContainer}>{children}</div>;
};

function CentralContentContainer(props) {
  const { coreApiVersionedUrlConfig, notifications, socket, user } = props;

  const { data: userInfo } = useGetUserInfoQuery(undefined, {
    skip: !props.user.logged,
  });

  if (
    !props.user.logged &&
    props.location.pathname === Url.get(Url.pages.landing)
  ) {
    return (
      <AnonymousHome
        client={props.client}
        homeCustomized={props.params["HOMEPAGE"]}
        user={props.user}
        model={props.model}
        location={props.location}
        params={props.params}
      />
    );
  }

  // check anonymous sessions settings
  const blockAnonymous = !user.logged && !props.params["ANONYMOUS_SESSIONS"];

  const appContext = {
    client: props.client,
    coreApiVersionedUrlConfig,
    location: props.location,
    model: props.model,
    notifications,
    params: props.params,
  };

  return (
    <div className="d-flex flex-grow-1">
      <AppContext.Provider value={appContext}>
        <Helmet>
          <title>Reproducible Data Science | Open Research | Renku</title>
        </Helmet>
        <Switch>
          <Route
            exact
            path="/login"
            render={(p) => (
              <ContainerWrap fullSize>
                <LoginRedirect key="login" {...p} {...props} />
              </ContainerWrap>
            )}
          />
          <Route
            exact
            path={Url.get(Url.pages.landing)}
            render={() =>
              props.user.logged ? (
                <ContainerWrap>
                  <Dashboard />
                </ContainerWrap>
              ) : null
            }
          />
          <Route
            path={Url.get(Url.pages.help)}
            render={(p) => (
              <ContainerWrap>
                <Help key="help" {...p} {...props} />
              </ContainerWrap>
            )}
          />
          <Route
            path={Url.get(Url.pages.search)}
            render={() => (
              <ContainerWrap>
                <SearchPage
                  key="kg-search"
                  userName={props.user?.data?.name}
                  isLoggedUser={props.user.logged}
                  model={props.model}
                />
              </ContainerWrap>
            )}
          />
          <Route
            path={Url.get(Url.pages.inactiveKgProjects)}
            render={(p) =>
              props.user?.logged ? (
                <ContainerWrap>
                  <InactiveKGProjectsPage
                    key="-inactive-kg-projects"
                    socket={socket}
                  />
                </ContainerWrap>
              ) : (
                <NotFound {...p} />
              )
            }
          />
          <Route
            exact
            path={[
              Url.get(Url.pages.projects),
              Url.get(Url.pages.projects.starred),
              Url.get(Url.pages.projects.all),
            ]}
            render={(p) => (
              <ContainerWrap>
                <ProjectList
                  key="projects"
                  user={props.user}
                  client={props.client}
                  statusSummary={props.statusSummary}
                  {...p}
                />
              </ContainerWrap>
            )}
          />
          <Route
            exact
            path={Url.get(Url.pages.project.new)}
            render={(p) => (
              <ContainerWrap>
                <NewProject
                  key="newProject"
                  model={props.model}
                  user={props.user}
                  client={props.client}
                  {...p}
                />
              </ContainerWrap>
            )}
          />
          <Route
            path="/projects/:subUrl+"
            render={(p) => (
              <Project.View
                key="project/view"
                client={props.client}
                params={props.params}
                model={props.model}
                user={props.user}
                blockAnonymous={blockAnonymous}
                notifications={notifications}
                socket={socket}
                {...p}
              />
            )}
          />
          <Route exact path={Url.get(Url.pages.sessions)}>
            {!user.logged ? <AnonymousSessionsList /> : <Redirect to="/" />}
          </Route>
          <Route
            path="/datasets/:identifier/add"
            render={(p) => (
              <DatasetAddToProject
                key="addDatasetNew"
                insideProject={false}
                identifier={p.match.params?.identifier?.replaceAll("-", "")}
                datasets={p.datasets}
                model={props.model}
              />
            )}
          />
          <Route
            path="/datasets/:identifier"
            render={(p) => (
              <ShowDataset
                key="datasetPreview"
                {...p}
                insideProject={false}
                identifier={p.match.params?.identifier?.replaceAll("-", "")}
                client={props.client}
                projectsUrl="/projects"
                selectedDataset={p.match.params.datasetId}
                datasetCoordinator={
                  new DatasetCoordinator(
                    props.client,
                    props.model.subModel("dataset")
                  )
                }
                logged={props.user.logged}
                model={props.model}
              />
            )}
          />
          <Route path="/datasets">
            <Redirect to="/search?type=dataset" />
          </Route>
          <Route
            path="/privacy"
            render={(p) => (
              <ContainerWrap>
                <Privacy key="privacy" params={props.params} {...p} />
              </ContainerWrap>
            )}
          />
          <Route
            path="/notifications"
            render={(p) => (
              <ContainerWrap>
                <NotificationsPage
                  key="notifications"
                  client={props.client}
                  model={props.model}
                  notifications={notifications}
                  {...p}
                />
              </ContainerWrap>
            )}
          />
          <Route
            path="/style-guide"
            render={(p) => (
              <ContainerWrap>
                <StyleGuide key="style-guide" baseUrl="/style-guide" {...p} />
              </ContainerWrap>
            )}
          />
          {userInfo?.isAdmin && (
            <Route path="/admin">
              <ContainerWrap>
                <AdminPage />
              </ContainerWrap>
            </Route>
          )}
          <Route path="*" render={(p) => <NotFound {...p} />} />
        </Switch>
      </AppContext.Provider>
    </div>
  );
}

function App(props) {
  const [webSocket, setWebSocket] = useState(null);
  const [notifications, setNotifications] = useState(null);

  useEffect(() => {
    const getLocation = () => props.location;
    const notificationManager = new NotificationsManager(
      props.model,
      props.client,
      getLocation
    );
    setNotifications(notificationManager);

    // Setup authentication listeners and notifications
    LoginHelper.setupListener();
    LoginHelper.triggerNotifications(notifications);

    // Setup WebSocket channel
    let webSocketUrl = props.client.uiserverUrl + "/ws";
    if (webSocketUrl.startsWith("http"))
      webSocketUrl = "ws" + webSocketUrl.substring(4);
    // ? adding a small delay to allow session cookie to be saved to local browser before sending requests
    setWebSocket(
      setupWebSocket(
        webSocketUrl,
        props.model,
        getLocation,
        props.client,
        notificationManager
      )
    );
  }, []); // eslint-disable-line

  // Avoid rendering the application while authenticating the user
  const user = useSelector((state) => state.stateModel.user);
  if (!user?.fetched && user?.fetching) {
    return (
      <section className="jumbotron-header rounded px-3 px-sm-4 py-3 py-sm-5 text-center mb-3">
        <h3 className="text-center text-primary">Checking user data</h3>
        <Loader />
      </section>
    );
  } else if (user.error) {
    return (
      <Unavailable model={props.model} statuspageId={props.statuspageId} />
    );
  }

  return (
    <Fragment>
      <Route
        render={(p) =>
          user.logged || p.location.pathname !== Url.get(Url.pages.landing) ? (
            <RenkuNavBar {...p} {...props} notifications={notifications} />
          ) : null
        }
      />
      <CentralContentContainer
        notifications={notifications}
        socket={webSocket}
        {...props}
      />
      <Route
        render={(propsRoute) => (
          <FooterNavbar {...propsRoute} params={props.params} />
        )}
      />
      <Route
        render={(propsRoute) => (
          <Cookie {...propsRoute} params={props.params} />
        )}
      />
      <ToastContainer />
    </Fragment>
  );
}

export default App;
