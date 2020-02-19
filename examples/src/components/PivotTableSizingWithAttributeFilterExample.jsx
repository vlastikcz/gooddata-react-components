// (C) 2007-2020 GoodData Corporation
import React, { Component } from "react";
import { AttributeFilter, ErrorComponent, Model, PivotTable } from "@gooddata/react-components";
import { VisualizationInput } from "@gooddata/typings";

import "@gooddata/react-components/styles/css/main.css";

import {
    locationResortIdentifier,
    locationResortUri,
    projectId,
    totalSalesIdentifier,
    yearDateIdentifier,
} from "../utils/fixtures";

const totalSales = Model.measure(totalSalesIdentifier)
    .format("#,##0")
    .alias("Sales");

const yearDate = Model.attribute(yearDateIdentifier);

const locationResort = Model.attribute(locationResortIdentifier);

export class PivotTableSizingWithAttributeFilterExample extends Component {
    constructor(props) {
        super(props);

        this.state = {
            // you can put here some attr. elements as a default selection for filter and chart components
            filters: [Model.negativeAttributeFilter(locationResortIdentifier, [])],
            error: null,
        };
    }

    onLoadingChanged(...params) {
        // eslint-disable-next-line no-console
        console.info("AttributeFilterExample onLoadingChanged", ...params);
    }

    onApply = filter => {
        // eslint-disable-next-line no-console
        console.log("AttributeFilterExample onApply", filter);
        this.setState({ filters: [], error: null });
        if (filter.in) {
            this.filterPositiveAttribute(filter);
        } else {
            this.filterNegativeAttribute(filter);
        }
    };

    onApplyWithFilterDefinition = filter => {
        // eslint-disable-next-line no-console
        console.log("AttributeFilterExample onApplyWithFilterDefinition", filter);
        const isPositiveFilter = VisualizationInput.isPositiveAttributeFilter(filter);
        const inType = isPositiveFilter ? "in" : "notIn";
        const filterItems = isPositiveFilter
            ? filter.positiveAttributeFilter[inType]
            : filter.negativeAttributeFilter[inType];

        if (!filterItems.length && isPositiveFilter) {
            this.setState({
                error: "The filter must have at least one item selected",
            });
        } else {
            this.setState({ filters: [filter], error: null });
        }
    };

    onError(...params) {
        // eslint-disable-next-line no-console
        console.info("AttributeFilterExample onLoadingChanged", ...params);
    }

    filterPositiveAttribute(filter) {
        const filters = [
            {
                positiveAttributeFilter: {
                    displayForm: {
                        identifier: filter.id,
                    },
                    in: filter.in.map(element => `${locationResortUri}/elements?id=${element}`),
                },
            },
        ];
        let error = null;
        if (filter.in.length === 0) {
            error = "The filter must have at least one item selected";
        }
        this.setState({ filters, error });
    }

    filterNegativeAttribute(filter) {
        const filters = [
            {
                negativeAttributeFilter: {
                    displayForm: {
                        identifier: filter.id,
                    },
                    notIn: filter.notIn.map(element => `${locationResortUri}/elements?id=${element}`),
                },
            },
        ];
        this.setState({ filters });
    }

    render() {
        const { filters, error } = this.state;
        return (
            <div className="s-attribute-filter" style={{ border: "1px solid red" }}>
                <AttributeFilter
                    projectId={projectId}
                    filter={filters[0]}
                    onApply={this.onApply}
                    onApplyWithFilterDefinition={this.onApplyWithFilterDefinition}
                />
                <div
                    style={{ width: 800, height: 600, border: "1px solid green" }}
                    className="s-pivot-table-sizing-with-attribute-filter"
                >
                    {error ? (
                        <ErrorComponent message={error} />
                    ) : (
                        <PivotTable
                            projectId={projectId}
                            measures={[totalSales]}
                            config={{
                                columnSizing: {
                                    defaultWidth: "viewport",
                                },
                            }}
                            filters={filters}
                            onLoadingChanged={this.onLoadingChanged}
                            onError={this.onError}
                            rows={[yearDate]}
                            columns={[locationResort]}
                        />
                    )}
                </div>
            </div>
        );
    }
}

export default PivotTableSizingWithAttributeFilterExample;
