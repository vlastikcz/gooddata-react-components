// (C) 2007-2020 GoodData Corporation
import React, { Component } from "react";
import { Model, PivotTable } from "@gooddata/react-components";

import "@gooddata/react-components/styles/css/main.css";

import {
    franchiseFeesAdRoyaltyIdentifier,
    franchiseFeesIdentifier,
    franchiseFeesIdentifierOngoingRoyalty,
    franchiseFeesInitialFranchiseFeeIdentifier,
    locationNameDisplayFormIdentifier,
    locationStateDisplayFormIdentifier,
    menuCategoryAttributeDFIdentifier,
    monthDateIdentifier,
    projectId,
    quarterDateIdentifier,
} from "../utils/fixtures";

const measures = [
    Model.measure(franchiseFeesIdentifier)
        .format("#,##0")
        .localIdentifier("franchiseFeesIdentifier"),
    Model.measure(franchiseFeesAdRoyaltyIdentifier)
        .format("#,##0")
        .localIdentifier("franchiseFeesAdRoyaltyIdentifier"),
    Model.measure(franchiseFeesInitialFranchiseFeeIdentifier).format("#,##0"),
    Model.measure(franchiseFeesIdentifierOngoingRoyalty).format("#,##0"),
];

const attributes = [
    Model.attribute(locationStateDisplayFormIdentifier),
    Model.attribute(locationNameDisplayFormIdentifier).localIdentifier("locationName"),
    Model.attribute(menuCategoryAttributeDFIdentifier).localIdentifier("menu"),
];

const totals = [
    {
        measureIdentifier: "franchiseFeesIdentifier",
        type: "sum",
        attributeIdentifier: "locationName",
    },
    {
        measureIdentifier: "franchiseFeesIdentifier",
        type: "avg",
        attributeIdentifier: "locationName",
    },
    {
        measureIdentifier: "franchiseFeesAdRoyaltyIdentifier",
        type: "sum",
        attributeIdentifier: "menu",
    },
    {
        measureIdentifier: "franchiseFeesIdentifier",
        type: "max",
        attributeIdentifier: "menu",
    },
];

const columns = [Model.attribute(quarterDateIdentifier), Model.attribute(monthDateIdentifier)];

export class PivotTableSizingWithSubtotalsExample extends Component {
    render() {
        return (
            <div style={{ width: 900, height: 600, border: "1px solid red" }} className="s-pivot-table-row-grouping">
                <PivotTable
                    projectId={projectId}
                    measures={measures}
                    config={{
                        menu: {
                            aggregations: true,
                            aggregationsSubMenu: true,
                        },
                        columnSizing: {
                            defaultWidth: "viewport",
                        },
                    }}
                    rows={attributes}
                    columns={columns}
                    totals={totals}
                    pageSize={20}
                    groupRows
                />
            </div>
        );
    }
}

export default PivotTableSizingWithSubtotalsExample;