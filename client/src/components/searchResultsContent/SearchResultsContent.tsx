/*!
 * Copyright 2021 - Swiss Data Science Center (SDSC)
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

import Masonry from "react-masonry-css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSadCry } from "@fortawesome/free-solid-svg-icons";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { SerializedError } from "@reduxjs/toolkit";

import { KgSearchResult, ListResponse } from "../../features/kgSearch/KgSearch";
import {
  FiltersProperties,
  hasInitialFilterValues,
  mapSearchResultToEntity,
} from "../../utils/helpers/KgSearchFunctions";
import { Loader } from "../Loader";
import ListCard from "../list/ListCard";
import { Pagination } from "../Pagination";
import { Button } from "../../utils/ts-wrappers";
import { useKgSearchContext } from "../../features/kgSearch/KgSearchContext";

interface SearchResultProps {
  data?: ListResponse<KgSearchResult>;
  isFetching: boolean;
  isLoading: boolean;
  onPageChange: Function; // eslint-disable-line @typescript-eslint/ban-types
  onRemoveFilters: Function; // eslint-disable-line @typescript-eslint/ban-types
  error?: FetchBaseQueryError | SerializedError;
}
interface EmptyResultProps {
  onRemoveFilters: Function; // eslint-disable-line @typescript-eslint/ban-types
  error?: FetchBaseQueryError | SerializedError;
}
const EmptyResult = ({ onRemoveFilters, error }: EmptyResultProps) => {
  const { kgSearchState } = useKgSearchContext();
  const { phrase, type, author, visibility, since, until, typeDate } =
    kgSearchState;
  const removeFilters = () => {
    if (onRemoveFilters) onRemoveFilters();
  };

  const currentFilters: FiltersProperties = {
    type,
    author,
    visibility,
    since,
    until,
    typeDate,
  };
  const hasFilters = hasInitialFilterValues(currentFilters);

  const phraseText = phrase ? (
    <p>
      We could not find any matches for phrase{" "}
      <span className="fst-italic fw-bold">{decodeURIComponent(phrase)}.</span>
    </p>
  ) : (
    " We could not find any matches."
  );

  const errorText = (
    <p>
      Search returned an error for phrase{" "}
      <span className="fst-italic fw-bold">{decodeURIComponent(phrase)}.</span>
    </p>
  );

  return (
    <div className="mt-5 text-center">
      <FontAwesomeIcon icon={faSadCry} size="3x" className="opacity-25" />{" "}
      {error ? errorText : phraseText}
      {!hasFilters ? (
        <p>
          To get some data you can modify the current filters or{" "}
          <Button color="primary" size="sm" onClick={removeFilters}>
            remove all filters
          </Button>
        </p>
      ) : null}
    </div>
  );
};

const SearchResultsContent = ({
  data,
  isFetching,
  isLoading,
  onPageChange,
  onRemoveFilters,
  error,
}: SearchResultProps) => {
  if (isLoading) return <Loader />;
  if (isFetching) return <Loader />;
  if (data == null) return <Loader />;

  if (!data || data.total === 0 || error)
    return <EmptyResult onRemoveFilters={onRemoveFilters} error={error} />;

  const rows = data.results.map((result, index) => {
    const entityProps = mapSearchResultToEntity(result);
    return <ListCard key={`entity-${index}`} {...entityProps} />;
  });

  const breakPointColumns = {
    default: 3,
    1250: 2,
    700: 1,
  };

  const changePage = (value: number) => {
    if (onPageChange) onPageChange(value);
  };

  return (
    <>
      <Masonry
        className="rk-search-result-grid mb-4"
        breakpointCols={breakPointColumns}
      >
        {rows}
      </Masonry>
      <Pagination
        currentPage={data.page}
        perPage={data.perPage}
        totalItems={data.total}
        onPageChange={changePage}
        showDescription={true}
        totalInPage={data.results?.length}
        className="d-flex justify-content-center rk-search-pagination"
      />
    </>
  );
};

export { SearchResultsContent };
